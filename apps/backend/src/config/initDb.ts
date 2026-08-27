import { query } from './db';

/**
 * Schema verification (replaces the legacy runtime table creation).
 *
 * The database schema is owned exclusively by the SQL migrations in
 * `apps/backend/migrations`, applied via `npm run migrate`
 * (scripts/run-migrations.js). A fresh database must be migrated before the
 * server starts; this check fails fast with a clear message instead of
 * letting requests hit missing tables.
 */
const REQUIRED_TABLES = [
  'schema_migrations',
  'users',
  'licenses',
  'refresh_tokens',
  'audit_logs',
  'sync_changes',
  'customers',
  'orders',
  'invoices',
  'invoice_items',
  'payments',
  'fabric_records',
  'order_material_usages',
  'app_settings',
  'workspace_members',
  'order_production_stages',
  'workspaces',
  'workspace_users',
  'processed_mutations',
];

export async function verifySchema() {
  const result = await query<{ table_name: string }>(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    `
  );

  const present = new Set(result.rows.map((row) => row.table_name));
  const missing = REQUIRED_TABLES.filter((table) => !present.has(table));

  if (missing.length > 0) {
    throw new Error(
      `Database schema is not migrated. Missing tables: ${missing.join(', ')}. ` +
        'Run "npm run migrate" against DATABASE_URL before starting the server.'
    );
  }
}
