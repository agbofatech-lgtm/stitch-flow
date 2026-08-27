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
  'integration_outbox',
  'portal_customers',
  'customer_feedback',
  'support_cases',
  'incidents',
  'error_records',
  'usage_events',
  'api_keys',
  'webhook_deliveries',
  'webhook_endpoints',
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
  // Phase 7: TRUNCATE users CASCADE also empties feature_flags (FK → users),
  // so re-seed the flags rather than assuming the migration rows survived.
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
