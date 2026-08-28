/**
 * Phase 6 — Backup/Restore verification (Step 28).
 *
 * REAL end-to-end restore test against embedded PostgreSQL 18.4:
 *
 *   production-like dataset
 *     → db-backup.js (consistent snapshot + manifest)
 *     → SECOND, freshly-migrated database (simulated disaster: empty target)
 *     → db-restore.js (checksum verify → transactional load → counts verify)
 *     → integrity-check.js against the restored database (must be CLEAN)
 *     → financial totals compared source vs restored (must match exactly)
 *
 * This is executed evidence, not a claim. (The production-environment
 * operational restore drill — offsite copy, encrypted storage, RTO timing —
 * remains a deployment-environment item; see the runbook.)
 */
import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { query } from '../src/config/db';

const SCRIPTS = path.join(__dirname, '..', 'scripts');
const MAIN_DB = process.env.DATABASE_URL as string;
const RESTORE_DB_NAME = 'stitchflow_restore_test';
const RESTORE_DB = MAIN_DB.replace(/\/[^/]+$/, `/${RESTORE_DB_NAME}`);

function run(script: string, args: string[], dbUrl: string) {
  return execFileSync(process.execPath, [path.join(SCRIPTS, script), ...args], {
    env: { ...process.env, DATABASE_URL: dbUrl },
    encoding: 'utf8',
    timeout: 120000,
  });
}

async function seedProductionLikeData() {
  // One workspace, customers, orders, invoices+items, payments, fabric +
  // usage, subscription, audit rows, sync state.
  await query(
    `INSERT INTO users (id, email, password_hash, full_name, role, status)
     VALUES ('11111111-1111-1111-1111-111111111111', 'owner@restore.test', 'x', 'Restore Owner', 'user', 'active')`
  );
  await query(
    `INSERT INTO workspaces (id, name, owner_user_id)
     VALUES ('ws-restore-1', 'Restore Workshop', '11111111-1111-1111-1111-111111111111')`
  );
  await query(
    `INSERT INTO workspace_users (workspace_id, user_id, role) VALUES ('ws-restore-1', '11111111-1111-1111-1111-111111111111', 'owner')`
  );
  await query(
    `INSERT INTO subscriptions (workspace_id, plan_code, status, current_period_start, current_period_end)
     VALUES ('ws-restore-1', 'PRO', 'active', NOW() - interval '10 days', NOW() + interval '20 days')`
  );
  await query(
    `INSERT INTO billing_events (provider, provider_event_id, event_type, workspace_id, status, payload)
     SELECT 'test', 'evt-restore-1', 'charge.success', s.workspace_id, 'processed', '{"amount":4500}'::jsonb
     FROM subscriptions s WHERE s.workspace_id = 'ws-restore-1'`
  );
  await query(
    `INSERT INTO customers (id, workspace_id, full_name, phone) VALUES
      ('rc-1', 'ws-restore-1', 'Ama Serwaa', '+233500000001'),
      ('rc-2', 'ws-restore-1', 'Kofi Mensah', '+233500000002')`
  );
  await query(
    `INSERT INTO orders (id, workspace_id, customer_id, order_number, status, order_type, total_amount,
        measurement_snapshot, garment_measurements)
     VALUES ('ro-1', 'ws-restore-1', 'rc-1', 'ORD-R1', 'in_progress', 'custom', 450,
        '{"bust":36,"waist":28,"hip":38}'::jsonb, '{"bust":36,"waist":28,"hip":38,"length":40}'::jsonb),
           ('ro-2', 'ws-restore-1', 'rc-2', 'ORD-R2', 'draft', 'custom', 120.50, NULL, NULL)`
  );
  await query(
    `INSERT INTO invoices (id, workspace_id, customer_id, order_id, invoice_number, status, total_amount, amount_paid, balance_due)
     VALUES ('ri-1', 'ws-restore-1', 'rc-1', 'ro-1', 'INV-R1', 'partially_paid', 450, 200, 250),
            ('ri-2', 'ws-restore-1', 'rc-2', 'ro-2', 'INV-R2', 'unpaid', 120.50, 0, 120.50)`
  );
  await query(
    `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total)
     VALUES ('rii-1', 'ri-1', 'Two-piece suit', 1, 450, 450)`
  );
  await query(
    `INSERT INTO payments (id, workspace_id, invoice_id, customer_id, order_id, amount, method, reference_code, payment_status)
     VALUES ('rp-1', 'ws-restore-1', 'ri-1', 'rc-1', 'ro-1', 200, 'cash', 'REF-R1', 'captured')`
  );
  await query(
    `INSERT INTO fabric_records (id, workspace_id, name, fabric_type, unit, quantity_in_stock)
     VALUES ('rf-1', 'ws-restore-1', 'Restore Cotton', 'cotton', 'yards', 8)`
  );
  await query(
    `INSERT INTO order_material_usages (id, order_id, fabric_record_id, quantity_used, unit)
     VALUES ('ru-1', 'ro-1', 'rf-1', 2, 'yards')`
  );
  await query(
    `INSERT INTO audit_logs (user_id, workspace_id, request_id, action, entity_type, entity_id, metadata)
     VALUES ('11111111-1111-1111-1111-111111111111', 'ws-restore-1', 'restore-req-1', 'CUSTOMER_CREATED', 'customer', 'rc-1', '{"source":"test"}')`
  );
  await query(
    `INSERT INTO sync_changes (workspace_id, user_id, table_name, operation, record_id, client_id, payload, occurred_at, client_mutation_id)
     VALUES ('ws-restore-1', '11111111-1111-1111-1111-111111111111', 'customers', 'insert', 'rc-1', gen_random_uuid(), '{}', NOW(), 'restore-mut-1')`
  );
  await query(
    `INSERT INTO processed_mutations (workspace_id, client_mutation_id, user_id, entity, entity_id, operation, result)
     VALUES ('ws-restore-1', 'restore-mut-1', '11111111-1111-1111-1111-111111111111', 'customers', 'rc-1', 'insert', '{"status":"applied"}')`
  );
}

describe('Phase 6 — backup / restore verification', () => {
  let backupDir: string;
  let sourceTotals: { invoices: string; payments: string; customers: string };
  let sourceSyncSeq = 0;

  it('backs up a production-like dataset with a verified manifest', async () => {
    await seedProductionLikeData();
    backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stitchflow-backup-'));

    const out = run('db-backup.js', [backupDir], MAIN_DB);
    expect(out).toContain('BACKUP RESULT: OK');
    expect(fs.existsSync(path.join(backupDir, 'manifest.json'))).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, 'manifest.json'), 'utf8'));
    expect(manifest.tables.customers.rows).toBe(2);
    expect(manifest.tables.invoices.rows).toBe(2);
    expect(manifest.tables.payments.rows).toBe(1);
    // No credentials leak into the manifest.
    expect(JSON.stringify(manifest)).not.toMatch(/password@/);

    sourceTotals = (
      await query<{ invoices: string; payments: string; customers: string }>(
        `SELECT
           (SELECT COALESCE(SUM(total_amount),0)::text FROM invoices) AS invoices,
           (SELECT COALESCE(SUM(amount),0)::text FROM payments) AS payments,
           (SELECT COUNT(*)::text FROM customers) AS customers`
      )
    ).rows[0];
  });

  it('restores into a freshly migrated second database and verifies counts', async () => {
    // Simulated disaster target: brand new database, schema via migrations only.
    const embeddedPg = (global as unknown as { __EMBEDDED_PG__?: { createDatabase(n: string): Promise<void>; dropDatabase?(n: string): Promise<void> } }).__EMBEDDED_PG__;

    if (embeddedPg) {
      await embeddedPg.createDatabase(RESTORE_DB_NAME).catch(() => undefined);
    } else {
      // External PostgreSQL: connect to the default 'postgres' database and create the restore DB.
      const { Pool } = require('pg');
      const masterUrl = (process.env.DATABASE_URL || '').replace(/\/[^/]+$/, '/postgres');
      const masterPool = new Pool({ connectionString: masterUrl });
      await masterPool.query(`CREATE DATABASE ${RESTORE_DB_NAME}`).catch(() => undefined);
      await masterPool.end();
    }

    // Run migrations on the restore database.
    run('run-migrations.js', [], RESTORE_DB);
    const out = run('db-restore.js', [backupDir], RESTORE_DB);
    expect(out).toContain('checksum verification: OK');
    expect(out).toContain('RESTORE RESULT: OK');
  });

  it('restored database passes the integrity checker (CLEAN)', () => {
    const res = spawnSync(
      process.execPath,
      [path.join(SCRIPTS, 'integrity-check.js')],
      { env: { ...process.env, DATABASE_URL: RESTORE_DB }, encoding: 'utf8', timeout: 60000 }
    );
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('INTEGRITY RESULT: CLEAN');
  });

  it('independent verification: schema, tenancy, measurements, catalog, financials, sync state all preserved', async () => {
    // Verified through a DIRECT connection to the restored database — not
    // via application repositories/services — so the check proves the
    // backup preserved the underlying rows themselves.
    const { Pool } = require('pg');
    const pool2 = new Pool({ connectionString: RESTORE_DB });

    // Schema/migrations: restore target was migrated by the real runner.
    const migrations = await pool2.query(`SELECT name FROM schema_migrations ORDER BY name`);
    const appliedNames = migrations.rows.map((r: { name: string }) => r.name);
    expect(appliedNames).toContain('012_phase6_audit_correlation.sql');
    expect(appliedNames).toContain('013_phase7_customer_growth.sql');
    // The restore target is migrated by the REAL runner: every migration
    // file in the repository must be applied there.
    const fs = require('fs');
    const migrationFiles = fs
      .readdirSync(path.join(__dirname, '..', 'migrations'))
      .filter((f: string) => f.endsWith('.sql'))
      .sort();
    expect(appliedNames).toEqual(migrationFiles);

    // Tenancy: exactly one non-default workspace, owner membership intact.
    const ws = await pool2.query(`SELECT id, name FROM workspaces WHERE id = 'ws-restore-1'`);
    expect(ws.rows.length).toBe(1);
    expect(ws.rows[0].name).toBe('Restore Workshop');
    const membership = await pool2.query(
      `SELECT role FROM workspace_users WHERE workspace_id = 'ws-restore-1' AND user_id = '11111111-1111-1111-1111-111111111111'`
    );
    expect(membership.rows[0].role).toBe('owner');

    // Tenant isolation on the restored data: every business row belongs to
    // the single seeded workspace — no cross-tenant drift.
    const tenantCheck = await pool2.query(`
      SELECT
        (SELECT COUNT(*) FROM customers WHERE workspace_id <> 'ws-restore-1' AND id LIKE 'rc-%') AS bad_customers,
        (SELECT COUNT(*) FROM orders   WHERE workspace_id <> 'ws-restore-1' AND id LIKE 'ro-%') AS bad_orders,
        (SELECT COUNT(*) FROM invoices WHERE workspace_id <> 'ws-restore-1' AND id LIKE 'ri-%') AS bad_invoices,
        (SELECT COUNT(*) FROM payments WHERE workspace_id <> 'ws-restore-1' AND id LIKE 'rp-%') AS bad_payments`);
    const t = tenantCheck.rows[0];
    expect(Number(t.bad_customers)).toBe(0);
    expect(Number(t.bad_orders)).toBe(0);
    expect(Number(t.bad_invoices)).toBe(0);
    expect(Number(t.bad_payments)).toBe(0);

    // Catalog + measurements: order rows with JSONB measurement snapshots
    // survive byte-exact (offline measurement data is irreplaceable).
    const order = await pool2.query(
      `SELECT measurement_snapshot, garment_measurements, total_amount FROM orders WHERE id = 'ro-1'`
    );
    expect(order.rows[0].measurement_snapshot).toEqual({ bust: 36, waist: 28, hip: 38 });
    expect(order.rows[0].garment_measurements).toEqual({ bust: 36, waist: 28, hip: 38, length: 40 });
    expect(Number(order.rows[0].total_amount)).toBe(450);

    // Financial document chain: invoice items + payment link intact.
    const items = await pool2.query(`SELECT description, quantity, unit_price FROM invoice_items WHERE invoice_id = 'ri-1'`);
    expect(items.rows.length).toBe(1);
    expect(items.rows[0].description).toBe('Two-piece suit');
    const payment = await pool2.query(`SELECT amount, method, payment_status FROM payments WHERE id = 'rp-1'`);
    expect(Number(payment.rows[0].amount)).toBe(200);
    expect(payment.rows[0].payment_status).toBe('captured');

    // Financial invariant on restored data: balanceDue = max(total - paid, 0).
    const balance = await pool2.query(
      `SELECT balance_due = GREATEST(total_amount - amount_paid, 0) AS ok FROM invoices WHERE id = 'ri-1'`
    );
    expect(balance.rows[0].ok).toBe(true);

    // Inventory invariant: stock non-negative and consistent with usage.
    const fabric = await pool2.query(`SELECT quantity_in_stock FROM fabric_records WHERE id = 'rf-1'`);
    expect(Number(fabric.rows[0].quantity_in_stock)).toBe(8);
    const usage = await pool2.query(`SELECT quantity_used FROM order_material_usages WHERE id = 'ru-1'`);
    expect(Number(usage.rows[0].quantity_used)).toBe(2);

    // Commercial state: subscription + billing event ledger survived.
    const sub = await pool2.query(`SELECT plan_code, status FROM subscriptions WHERE workspace_id = 'ws-restore-1'`);
    expect(sub.rows[0].plan_code).toBe('PRO');
    expect(sub.rows[0].status).toBe('active');
    const billingEvent = await pool2.query(
      `SELECT event_type, status, payload FROM billing_events WHERE provider_event_id = 'evt-restore-1'`
    );
    expect(billingEvent.rows.length).toBe(1);
    expect(billingEvent.rows[0].event_type).toBe('charge.success');
    expect(billingEvent.rows[0].status).toBe('processed');
    expect(billingEvent.rows[0].payload).toEqual({ amount: 4500 });

    // Audit trail + sync state survived with correlation columns.
    const audit = await pool2.query(
      `SELECT action, workspace_id, request_id FROM audit_logs WHERE entity_id = 'rc-1'`
    );
    expect(audit.rows[0].action).toBe('CUSTOMER_CREATED');
    expect(audit.rows[0].workspace_id).toBe('ws-restore-1');
    expect(audit.rows[0].request_id).toBe('restore-req-1');
    const mutations = await pool2.query(
      `SELECT client_mutation_id FROM processed_mutations WHERE workspace_id = 'ws-restore-1'`
    );
    expect(mutations.rows.map((r: { client_mutation_id: string }) => r.client_mutation_id)).toContain('restore-mut-1');
    const syncRows = await pool2.query(`SELECT record_id, seq FROM sync_changes WHERE record_id = 'rc-1' AND workspace_id = 'ws-restore-1'`);
    expect(syncRows.rows.length).toBe(1);
    sourceSyncSeq = Number(syncRows.rows[0].seq);

    await pool2.end();
  });

  it('sync cursor on the restored database starts ABOVE the restored maximum (monotonicity preserved)', async () => {
    const { Pool } = require('pg');
    const pool2 = new Pool({ connectionString: RESTORE_DB });
    await pool2.query(
      `INSERT INTO sync_changes (workspace_id, user_id, table_name, operation, record_id, client_id, payload, occurred_at)
       VALUES ('ws-restore-1', '11111111-1111-1111-1111-111111111111', 'customers', 'update', 'rc-1', gen_random_uuid(), '{}', NOW())`
    );
    const seq = await pool2.query(`SELECT seq FROM sync_changes ORDER BY seq DESC LIMIT 1`);
    // The new row must have the highest seq — no reuse of restored cursor values.
    expect(Number(seq.rows[0].seq)).toBeGreaterThan(sourceSyncSeq);
    await pool2.end();
  });

  it('financial totals match the source database exactly', async () => {
    const { Pool } = require('pg');
    const restorePool = new Pool({ connectionString: RESTORE_DB });
    const restored = await restorePool.query(
      `SELECT
         (SELECT COALESCE(SUM(total_amount),0)::text FROM invoices) AS invoices,
         (SELECT COALESCE(SUM(amount),0)::text FROM payments) AS payments,
         (SELECT COUNT(*)::text FROM customers) AS customers`
    );
    // Exact numeric scale must survive the backup round-trip (120.50 not 120.5).
    const scaleCheck = await restorePool.query(
      `SELECT total_amount::text AS t FROM invoices WHERE id = 'ri-2'`
    );
    await restorePool.end();

    expect(restored.rows[0].invoices).toBe(sourceTotals.invoices);
    expect(restored.rows[0].payments).toBe(sourceTotals.payments);
    expect(restored.rows[0].customers).toBe(sourceTotals.customers);
    expect(scaleCheck.rows[0].t).toBe('120.50');
  });

  it('restore refuses a tampered backup (checksum gate)', async () => {
    const tampered = fs.mkdtempSync(path.join(os.tmpdir(), 'stitchflow-tampered-'));
    fs.cpSync(backupDir, tampered, { recursive: true });
    fs.appendFileSync(path.join(tampered, 'customers.jsonl'), '{"id":"evil"}\n');

    const res = spawnSync(
      process.execPath,
      [path.join(SCRIPTS, 'db-restore.js'), tampered],
      { env: { ...process.env, DATABASE_URL: RESTORE_DB }, encoding: 'utf8', timeout: 60000 }
    );
    expect(res.status).toBe(2);
    expect(res.stderr).toContain('checksum mismatch');
  });
});