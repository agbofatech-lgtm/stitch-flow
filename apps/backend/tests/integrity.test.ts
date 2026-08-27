/**
 * Phase 6 — Data Integrity Auditor tests (Step 29).
 *
 * Executes the real scripts/integrity-check.js against the embedded
 * PostgreSQL instance:
 *  1. CLEAN on a freshly migrated database.
 *  2. Detects every INSERTABLE corruption class (financial arithmetic,
 *     cross-tenant material usage, cross-workspace mutation-key reuse).
 *  3. Schema-level guarantees: referential orphans and workspace-less
 *     business rows are NOT insertable (FK/NOT NULL constraints) — the
 *     auditor's checks for them are defense-in-depth.
 *  4. The checker is read-only.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { query } from '../src/config/db';

const SCRIPT = path.join(__dirname, '..', 'scripts', 'integrity-check.js');
const DATABASE_URL = process.env.DATABASE_URL as string;

function runChecker(): { status: number; stdout: string; stderr: string } {
  const res = spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, DATABASE_URL },
    encoding: 'utf8',
    timeout: 30000,
  });
  return {
    status: res.status ?? -1,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

describe('Phase 6 — data integrity auditor', () => {
  it('reports CLEAN on a freshly migrated database (exit 0)', () => {
    const { status, stdout, stderr } = runChecker();
    if (status !== 0) console.log('CHECKER STDERR:', stderr.slice(0, 300));
    expect(status).toBe(0);
    expect(stdout).toContain('INTEGRITY RESULT: CLEAN');
  });

  it('detects financial, cross-tenant, and sync violations (exit 1)', async () => {
    // Anchor customer (FK target for the corrupt invoice).
    await query(
      `INSERT INTO customers (id, workspace_id, full_name, phone)
       VALUES ('integ-cust-1', 'default-workspace', 'Integrity Customer', '+233500000099')`
    );
    // Financial: negative invoice total + balance mismatch.
    await query(
      `INSERT INTO invoices (id, workspace_id, customer_id, invoice_number, status,
        total_amount, amount_paid, balance_due)
       VALUES ('integ-bad-inv-1', 'default-workspace', 'integ-cust-1', 'BAD-1', 'unpaid', -50, 0, 0)`
    );
    // Inventory: cross-tenant usage — order in default-workspace consumes
    // a fabric belonging to another workspace.
    await query(
      `INSERT INTO workspaces (id, name) VALUES ('integ-ws-3', 'Integrity WS 3') ON CONFLICT DO NOTHING`
    );
    await query(
      `INSERT INTO orders (id, workspace_id, customer_id, order_number, status, order_type, total_amount)
       VALUES ('integ-bad-ord-1', 'default-workspace', 'integ-cust-1', 'BAD-ORD', 'draft', 'custom', 10)`
    );
    await query(
      `INSERT INTO fabric_records (id, workspace_id, name, fabric_type, unit, quantity_in_stock)
       VALUES ('integ-fab-1', 'integ-ws-3', 'Foreign Fabric', 'cotton', 'yards', 5)`
    );
    await query(
      `INSERT INTO order_material_usages (id, order_id, fabric_record_id, quantity_used, unit)
       VALUES ('integ-usage-1', 'integ-bad-ord-1', 'integ-fab-1', 1, 'yards')`
    );
    // Sync: the same client_mutation_id reused across two workspaces
    // (intra-workspace duplicates are blocked by a UNIQUE constraint).
    await query(
      `INSERT INTO workspaces (id, name) VALUES ('integ-ws-2', 'Integrity WS 2') ON CONFLICT DO NOTHING`
    );
    await query(
      `INSERT INTO processed_mutations (client_mutation_id, workspace_id, entity, operation)
       VALUES ('dup-mut-1', 'default-workspace', 'customers', 'insert')`
    );
    await query(
      `INSERT INTO processed_mutations (client_mutation_id, workspace_id, entity, operation)
       VALUES ('dup-mut-1', 'integ-ws-2', 'customers', 'insert')`
    );

    const { status, stdout } = runChecker();
    expect(status).toBe(1);
    expect(stdout).toContain('financial/negative_invoice_total');
    expect(stdout).toContain('financial/balance_mismatch');
    expect(stdout).toContain('inventory/cross_tenant_usage');
    expect(stdout).toContain('sync/duplicate_client_mutation');
  });

  it('schema guarantees: workspace-less business rows are NOT insertable (auditor checks are defense-in-depth)', async () => {
    await expect(
      query(
        `INSERT INTO orders (id, customer_id, order_number, status, order_type, total_amount)
         VALUES ('integ-bad-ord-2', 'integ-cust-1', 'X', 'draft', 'custom', 1)`
      )
    ).rejects.toThrow(/workspace_id/);

    await expect(
      query(
        `INSERT INTO orders (id, workspace_id, customer_id, order_number, status, order_type, total_amount)
         VALUES ('integ-bad-ord-3', 'default-workspace', 'no-such-customer', 'X', 'draft', 'custom', 1)`
      )
    ).rejects.toThrow(/orders_customer_id_fkey/);
  });

  it('is read-only: corruption inserted by SQL is still present afterwards (checker wrote nothing)', async () => {
    // setup.ts truncates between tests — recreate the corrupt row here.
    await query(
      `INSERT INTO customers (id, workspace_id, full_name, phone)
       VALUES ('integ-cust-rw', 'default-workspace', 'RW Customer', '+233500000098')`
    );
    await query(
      `INSERT INTO invoices (id, workspace_id, customer_id, invoice_number, status,
        total_amount, amount_paid, balance_due)
       VALUES ('integ-bad-inv-rw', 'default-workspace', 'integ-cust-rw', 'BAD-RW', 'unpaid', -10, 0, 0)`
    );
    const before = await query(`SELECT COUNT(*)::int AS n FROM invoices WHERE id = 'integ-bad-inv-rw'`);
    expect(before.rows[0].n).toBe(1);
    runChecker(); // run over the same bad state
    const after = await query(`SELECT COUNT(*)::int AS n FROM invoices WHERE id = 'integ-bad-inv-rw'`);
    expect(after.rows[0].n).toBe(1);
  });
});
