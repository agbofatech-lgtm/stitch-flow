import { pool, query } from '../src/config/db';

/** Tables reset between tests (schema_migrations is preserved). */
const TABLES = [
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
  'users',
];

beforeEach(async () => {
  await query(`TRUNCATE TABLE ${TABLES.join(', ')} CASCADE`);
});

afterAll(async () => {
  await pool.end();
});
