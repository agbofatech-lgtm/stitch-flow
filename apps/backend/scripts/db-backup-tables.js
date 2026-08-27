/**
 * Canonical table list for the logical backup/restore tooling.
 * FK-safe order: parents before children (shared by db-backup.js and
 * db-restore.js so the pair can never drift).
 */
module.exports = [
  'users',
  'workspaces',
  'workspace_users',
  'licenses',
  'license_devices',
  'refresh_tokens',
  'audit_logs',
  // Phase 7 intelligence/platform (after workspaces/users/customers deps)
  'usage_events',
  'error_records',
  'incidents',
  'integration_outbox',
  'api_keys',
  'webhook_endpoints',
  'webhook_deliveries',
  'subscriptions',
  'billing_events',
  'customers',
  'support_cases',       // FK → customers
  'customer_feedback',   // FK → customers
  'portal_customers',    // FK → customers
  'customer_notes',
  'customer_preferences',
  'customer_timeline_entries',
  'referrals',
  'orders',
  'invoices',
  'invoice_items',
  'payments',
  'fabric_records',
  'order_material_usages',
  'appointments',
  'fittings',
  'fit_observations',
  'order_production_stages',
  'order_production_stage_events',
  'app_settings',
  'workspace_members',
  'events',
  'feature_requests',
  'feature_request_votes',
  'sync_changes',
  'processed_mutations',
];
