import { query, testDbConnection } from '../src/config/db';
import { verifySchema } from '../src/config/initDb';

describe('Database foundation', () => {
  it('connects to the database', async () => {
    const row = await testDbConnection();
    expect(row.now).toBeDefined();
  });

  it('has applied every migration (schema_migrations)', async () => {
    const result = await query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY name'
    );
    const names = result.rows.map((row) => row.name);

    expect(names).toEqual([
      '001_init_extensions.sql',
      '002_create_core_tables.sql',
      '003_create_sync_tables.sql',
      '004_create_indexes.sql',
      '005_seed_admin.sql',
      '006_create_business_tables.sql',
      '007_create_order_production_stages.sql',
      '008_create_workspaces.sql',
      '009_add_workspace_tenancy.sql',
      '010_sync_v2.sql',
      '011_commercial_foundation.sql',
      '012_phase6_audit_correlation.sql',
      '013_phase7_customer_growth.sql',
      '014_phase7_intelligence.sql',
      '015_phase8_developer_api.sql',
      '016_phase8_webhooks.sql',
    ]);
  });

  it('passes the startup schema verification', async () => {
    await expect(verifySchema()).resolves.toBeUndefined();
  });

  it('enforces unique user emails', async () => {
    await query(
      `INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3)`,
      ['unique@example.com', 'hash', 'One']
    );

    await expect(
      query(`INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3)`, [
        'unique@example.com',
        'hash',
        'Two',
      ])
    ).rejects.toThrow(/duplicate key/);
  });

  it('enforces the invoices -> customers foreign key', async () => {
    await expect(
      query(
        `INSERT INTO invoices (id, workspace_id, customer_id, invoice_number, total_amount)
         VALUES ('inv-x', 'default-workspace', 'no-such-customer', 'INV-1', 100)`
      )
    ).rejects.toThrow(/foreign key/);
  });

  it('enforces the production stage status CHECK constraint', async () => {
    await query(
      `INSERT INTO customers (id, workspace_id, full_name) VALUES ('cust-1', 'default-workspace', 'Check Customer')`
    );
    await query(
      `INSERT INTO orders (id, workspace_id, customer_id, order_number, total_amount)
       VALUES ('ord-1', 'default-workspace', 'cust-1', 'ORD-1', 0)`
    );

    await expect(
      query(
        `INSERT INTO order_production_stages (order_id, stage_code, stage_label, sequence_no, status)
         VALUES ('ord-1', 'cutting', 'Cutting', 1, 'bogus-status')`
      )
    ).rejects.toThrow(/check constraint/);
  });

  it('enforces non-negative stock (CHECK constraint)', async () => {
    await expect(
      query(
        `INSERT INTO fabric_records (id, workspace_id, name, fabric_type, unit, quantity_in_stock)
         VALUES ('fab-neg', 'default-workspace', 'Bad', 'cotton', 'yards', -1)`
      )
    ).rejects.toThrow(/check constraint/);
  });

  it('enforces processed_mutations idempotency uniqueness', async () => {
    await query(
      `INSERT INTO processed_mutations (workspace_id, client_mutation_id, entity, operation)
       VALUES ('default-workspace', 'cmid-1', 'customers', 'insert')`
    );
    await expect(
      query(
        `INSERT INTO processed_mutations (workspace_id, client_mutation_id, entity, operation)
         VALUES ('default-workspace', 'cmid-1', 'customers', 'insert')`
      )
    ).rejects.toThrow(/duplicate key/);
  });

  it('supports transactions (rollback leaves no rows)', async () => {
    const { pool } = await import('../src/config/db');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO customers (id, workspace_id, full_name) VALUES ('tx-1', 'default-workspace', 'Rollback Me')`
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    const result = await query(`SELECT id FROM customers WHERE id = 'tx-1'`);
    expect(result.rows).toHaveLength(0);
  });
});
