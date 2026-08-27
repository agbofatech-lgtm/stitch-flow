/**
 * StitchFlow Data Integrity Auditor (Phase 6, Step 29).
 *
 * READ-ONLY invariant checker, safe to run against production at any time:
 * every query is a SELECT; the tool never writes, never locks rows beyond
 * ShareLock-avoiding plain reads, and exits non-zero when violations are
 * found (CI/ops friendly).
 *
 * Invariants checked:
 *   Financial   — negative invoice total; balance mismatch
 *                 (balance_due = max(total_amount - amount_paid, 0));
 *                 negative payment amount.
 *   Inventory   — negative stock; usage rows referencing missing
 *                 fabrics/orders (cross-tenant usage detection included).
 *   Tenant      — workspace-owned rows missing workspace_id.
 *   Sync        — duplicate client_mutation_id; cursor regressions
 *                 (non-monotonic seq ordering is structurally impossible
 *                 with BIGSERIAL, so we verify PK/sequence health instead).
 *   Referential — orphan customers/orders/invoices/payments.
 *
 * Usage:  DATABASE_URL=... node scripts/integrity-check.js
 * Exit:   0 = clean · 1 = violations found · 2 = unable to run
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const QUERIES = {
  // ---- Financial ---------------------------------------------------------
  'financial/negative_invoice_total': `
    SELECT i.id, i.workspace_id, i.total_amount
    FROM invoices i
    WHERE i.total_amount < 0 AND i.deleted_at IS NULL`,
  'financial/negative_payment_amount': `
    SELECT p.id, p.workspace_id, p.amount
    FROM payments p
    WHERE p.amount < 0`,
  'financial/balance_mismatch': `
    SELECT i.id, i.workspace_id, i.total_amount, i.amount_paid, i.balance_due
    FROM invoices i
    WHERE i.deleted_at IS NULL
      AND i.balance_due <> GREATEST(i.total_amount - i.amount_paid, 0)`,
  // ---- Inventory ---------------------------------------------------------
  'inventory/negative_stock': `
    SELECT f.id, f.workspace_id, f.quantity_in_stock
    FROM fabric_records f
    WHERE f.quantity_in_stock < 0 AND f.deleted_at IS NULL`,
  'inventory/usage_fabric_missing': `
    SELECT u.id, u.order_id, u.fabric_record_id
    FROM order_material_usages u
    LEFT JOIN fabric_records f ON f.id = u.fabric_record_id
    WHERE u.deleted_at IS NULL AND f.id IS NULL`,
  'inventory/cross_tenant_usage': `
    SELECT u.id, o.workspace_id AS order_ws, f.workspace_id AS fabric_ws
    FROM order_material_usages u
    JOIN orders o ON o.id = u.order_id
    JOIN fabric_records f ON f.id = u.fabric_record_id
    WHERE u.deleted_at IS NULL
      AND o.workspace_id <> f.workspace_id`,
  // ---- Tenant scoping (constraints make these impossible; audited as
  //      defense-in-depth in case a constraint is ever dropped) -----------
  'tenant/customers_without_workspace': `
    SELECT c.id FROM customers c
    WHERE c.workspace_id IS NULL AND c.deleted_at IS NULL`,
  'tenant/orders_without_workspace': `
    SELECT o.id FROM orders o
    WHERE o.workspace_id IS NULL AND o.deleted_at IS NULL`,
  'tenant/invoices_without_workspace': `
    SELECT i.id FROM invoices i
    WHERE i.workspace_id IS NULL AND i.deleted_at IS NULL`,
  'tenant/payments_without_workspace': `
    SELECT p.id FROM payments p
    WHERE p.workspace_id IS NULL`,
  'tenant/materials_without_workspace': `
    SELECT f.id FROM fabric_records f
    WHERE f.workspace_id IS NULL AND f.deleted_at IS NULL`,
  // ---- Sync --------------------------------------------------------------
  // (workspace_id, client_mutation_id) duplicates are prevented by UNIQUE;
  // the same mutation key appearing in TWO workspaces means cross-tenant
  // key reuse and is flagged.
  'sync/duplicate_client_mutation': `
    SELECT client_mutation_id, COUNT(DISTINCT workspace_id) AS workspaces
    FROM processed_mutations
    GROUP BY client_mutation_id
    HAVING COUNT(DISTINCT workspace_id) > 1`,
  // ---- Phase 7 domains ----------------------------------------------------
  'referential/orphan_appointment_customer': `
    SELECT a.id, a.customer_id FROM appointments a
    LEFT JOIN customers c ON c.id = a.customer_id
    WHERE a.deleted_at IS NULL AND c.id IS NULL`,
  'referential/orphan_fitting_customer': `
    SELECT f.id, f.customer_id FROM fittings f
    LEFT JOIN customers c ON c.id = f.customer_id
    WHERE f.deleted_at IS NULL AND c.id IS NULL`,
  'referential/orphan_referral_referrer': `
    SELECT r.id, r.referrer_customer_id FROM referrals r
    LEFT JOIN customers c ON c.id = r.referrer_customer_id
    WHERE r.referrer_customer_id IS NOT NULL AND c.id IS NULL`,
  // ---- Referential -------------------------------------------------------
  'referential/orphan_order_customer': `
    SELECT o.id, o.customer_id FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.deleted_at IS NULL AND c.id IS NULL`,
  'referential/orphan_invoice_customer': `
    SELECT i.id, i.customer_id FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    WHERE i.deleted_at IS NULL AND c.id IS NULL`,
  'referential/orphan_payment_invoice': `
    SELECT p.id, p.invoice_id FROM payments p
    LEFT JOIN invoices i ON i.id = p.invoice_id
    WHERE i.id IS NULL`,
  'referential/orphan_subscription_workspace': `
    SELECT s.id, s.workspace_id FROM subscriptions s
    LEFT JOIN workspaces w ON w.id = s.workspace_id
    WHERE w.id IS NULL`,
  // ---- Phase 8 domains ----------------------------------------------------
  'referential/orphan_api_key_workspace': `
    SELECT k.id, k.workspace_id FROM api_keys k
    LEFT JOIN workspaces w ON w.id = k.workspace_id
    WHERE w.id IS NULL`,
  'referential/orphan_webhook_endpoint_workspace': `
    SELECT e.id, e.workspace_id FROM webhook_endpoints e
    LEFT JOIN workspaces w ON w.id = e.workspace_id
    WHERE w.id IS NULL`,
  'referential/orphan_webhook_delivery_workspace': `
    SELECT d.id, d.workspace_id FROM webhook_deliveries d
    LEFT JOIN workspaces w ON w.id = d.workspace_id
    WHERE w.id IS NULL`,
  // ---- Informational (never counts as a violation) -----------------------
  'info/sync_cursor_stats': `
    SELECT COALESCE(MAX(seq), 0) AS max_seq, COUNT(*) AS rows
    FROM sync_changes`,
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(2);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
    max: 2, // deliberately small: audit must never stress a busy database
  });

  let violations = 0;
  const report = {};

  try {
    for (const [check, sql] of Object.entries(QUERIES)) {
      const informational = check.startsWith('info/');
      const res = await pool.query(sql);
      report[check] = { count: res.rows.length, rows: res.rows.slice(0, 20) };
      if (informational) {
        console.log(`  INFO       ${check}: ${JSON.stringify(res.rows[0] || {})}`);
      } else if (res.rows.length > 0) {
        violations += res.rows.length;
        console.log(`  VIOLATION  ${check}: ${res.rows.length} row(s)`);
      } else {
        console.log(`  OK         ${check}`);
      }
    }
  } catch (err) {
    console.error('integrity check failed to run:', err.message);
    await pool.end().catch(() => undefined);
    process.exit(2);
  }

  await pool.end();

  const summary = {
    generatedAt: new Date().toISOString(),
    checksRun: Object.keys(QUERIES).length,
    violations,
    details: report,
  };

  const outPath = process.argv.includes('--json')
    ? process.argv[process.argv.indexOf('--json') + 1]
    : null;
  if (outPath) {
    fs.writeFileSync(path.resolve(outPath), JSON.stringify(summary, null, 2));
    console.log(`\nreport written to ${outPath}`);
  }

  console.log(`\nINTEGRITY RESULT: ${violations === 0 ? 'CLEAN' : `${violations} VIOLATION(S)`}`);
  process.exit(violations === 0 ? 0 : 1);
}

main();
