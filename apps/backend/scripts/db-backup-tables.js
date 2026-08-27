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
  'subscriptions',
  'billing_events',
  'customers',
  'orders',
  'invoices',
  'invoice_items',
  'payments',
  'fabric_records',
  'order_material_usages',
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
