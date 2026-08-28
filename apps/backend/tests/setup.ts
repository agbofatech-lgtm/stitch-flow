import { pool, query } from '../src/config/db';

/** Tables reset between tests (schema_migrations is preserved). */
// We will truncate only tables that actually exist in the current schema.
const TABLES = [
  // Core auth & workspace
  'users',
  'workspaces',
  'workspace_users',
  'refresh_tokens',
  'audit_logs',
  // Phase 7/8 platform tables
  'feature_flags',
  'integration_outbox',
  'api_keys',
  'usage_events',
  'error_records',
  'incidents',
  // Webhook tables (Phase 8)
  'webhook_endpoints',
  'webhook_deliveries',
  // Sync & processed mutations (Phase 3.5/6)
  'sync_changes',
  'processed_mutations',
  // Other core business tables that exist in Phase 1-6
  'customers',
  'orders',
  'invoices',
  'payments',
  'fabric_records',
  'order_production_stages',
  'order_production_stage_events',
  'order_material_usages',
  'invoice_items',
  // Phase 5 commercial tables
  'billing_events',
  'subscriptions',
  // Phase 4-6 tables
  'license_devices',
  'licenses',
  // Phase 7-8 portal & support (if they exist, they will be truncated)
  'portal_customers',
  'customer_feedback',
  'support_cases',
];

beforeEach(async () => {
  // Dynamically truncate only tables that exist in the public schema.
  //
  // Harness hardening (Phase 10 investigation): TRUNCATE takes ACCESS
  // EXCLUSIVE locks while fire-and-forget background writes from the
  // previous test (audit rows, timeline entries, outbox inserts) may still
  // hold row locks — Postgres can resolve that ordering as a deadlock
  // (40P01). Proven pre-existing on the Phase 9 baseline (same failure with
  // zero Phase 10 code). The truncation is idempotent, so retrying is safe
  // and makes the suite deterministic; no test assertions are affected.
  for (let attempt = 1; ; attempt++) {
    try {
      await query(`
    DO $$
    DECLARE
      t text;
    BEGIN
      FOREACH t IN ARRAY ARRAY[${TABLES.map(t => `'${t}'`).join(', ')}] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
          EXECUTE format('TRUNCATE TABLE %I CASCADE', t);
        END IF;
      END LOOP;
    END $$;
  `);
      break;
    } catch (err) {
      const isDeadlock = (err as { code?: string }).code === '40P01';
      if (!isDeadlock || attempt >= 5) throw err;
      await new Promise((r) => setTimeout(r, 100 * attempt));
    }
  }
  // Re-seed feature_flags after TRUNCATE.
  await query(`
    INSERT INTO feature_flags (flag_key, enabled, description) VALUES
      ('AI_DIAGNOSTICS', false, 'Advisory AI diagnostics (interface only)'),
      ('OPENAI', false, 'Future OpenAI provider (interface only)'),
      ('GEMINI', false, 'Future Gemini provider (interface only)'),
      ('CLAUDE', false, 'Future Claude provider (interface only)'),
      ('N8N', false, 'Future n8n automation (interface only)'),
      ('CUSTOMER_PORTAL', false, 'Customer-facing portal (Phase 7: foundation)'),
      ('WHATSAPP', false, 'Future WhatsApp provider (interface only)'),
      ('ADVANCED_ANALYTICS', false, 'Advanced analytics (future)'),
      ('DEVELOPER_DASHBOARD', false, 'Developer dashboard (Phase 8)'),
      ('DEVELOPER_API', false, 'Developer API + keys (Phase 8)'),
      ('USAGE_DASHBOARD', false, 'Usage dashboard (Phase 8)'),
      ('WEBHOOK_MANAGEMENT', false, 'Webhook management (Phase 8)'),
      ('PROVIDER_REGISTRY', false, 'Provider registry (Phase 8)'),
      ('AI_FEATURES', false, 'AI features boundary (Phase 8)'),
      ('AUTOMATION_FEATURES', false, 'Automation boundary (Phase 8)')
    ON CONFLICT (flag_key) DO UPDATE SET enabled = false, updated_by = NULL
  `);
  // Reseed the legacy anchor workspace created by migration 008.
  await query(
    `INSERT INTO workspaces (id, name) VALUES ('default-workspace', 'Default Workspace')
     ON CONFLICT (id) DO NOTHING`
  );
});

afterAll(async () => {
  await pool.end();
});