import { pool, query } from '../src/config/db';

/** Tables reset between tests (schema_migrations is preserved). */
const TABLES = [
  'fit_observations',
  'fittings',
  'appointments',
  'referrals',
  'customer_timeline_entries',
  'customer_preferences',
  'customer_notes',
  'billing_events',
  'subscriptions',
  'processed_mutations',
  'order_material_usages',
  'order_production_stage_events',
  'order_production_stages',
  'payments',
  'invoice_items',
  'invoices',
  'orders',
  'customers',
  'fabric_records',
  'workspace_members',
  'app_settings',
  'sync_changes',
  'refresh_tokens',
  'audit_logs',
  'events',
  'feature_request_votes',
  'feature_requests',
  'license_devices',
  'licenses',
  'workspace_users',
  'workspaces',
  'users',
];

beforeEach(async () => {
  await query(`TRUNCATE TABLE ${TABLES.join(', ')} CASCADE`);
  // Reseed the legacy anchor workspace created by migration 008.
  await query(
    `INSERT INTO workspaces (id, name) VALUES ('default-workspace', 'Default Workspace')
     ON CONFLICT (id) DO NOTHING`
  );
});

afterAll(async () => {
  await pool.end();
});
