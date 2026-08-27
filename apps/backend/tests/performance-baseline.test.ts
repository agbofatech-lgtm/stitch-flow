/**
 * Phase 6 — Performance baseline (Step 30/31). MEASURES, does not guess.
 *
 * Environment: in-process Express app + embedded PostgreSQL 18.4 (jest).
 * NOTE: tests/setup.ts truncates all tables before EACH test, so seeding
 * AND measuring happen inside ONE test — every measured request operates
 * against the full production-like dataset:
 *   300 customers · 200 orders · 200 sync_changes rows.
 *
 * Assertions use GENEROUS bounds (catch pathology, not machine variance);
 * measured numbers are written to tests/perf-results.json for the report.
 */
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser, type AuthSession } from './helpers';
import { randomUUID } from 'crypto';

interface Stats { n: number; p50: number; p95: number; p99: number; max: number }

interface PlanElement { Plan?: PlanNode; 'Execution Time'?: number }
interface PlanNode { 'Node Type'?: string; Plans?: PlanNode[] }
/** Human-readable plan chain, e.g. "Limit -> Sort -> Index Scan". */
function planChain(node: PlanNode): string {
  const t = node['Node Type'] ?? '?';
  const child = node.Plans?.[0];
  return child ? `${t} -> ${planChain(child)}` : t;
}

const results: Record<string, unknown> = {
  environment: 'in-process supertest + embedded PostgreSQL 18.4 (jest, single workspace)',
  dataset: { customers: 300, orders: 200, syncChanges: 200 },
  measuredAt: '',
};

function stats(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
  return {
    n: sorted.length,
    p50: Math.round(at(0.5) * 100) / 100,
    p95: Math.round(at(0.95) * 100) / 100,
    p99: Math.round(at(0.99) * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
  };
}

async function timed(fn: () => Promise<request.Response>, n: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = process.hrtime.bigint();
    const res = await fn();
    if (res.status >= 400) throw new Error(`measurement request failed: ${res.status} ${JSON.stringify(res.body).slice(0, 120)}`);
    out.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  return out;
}

describe('Phase 6 — performance baseline', () => {
  it('measures API latency, sync throughput and query plans against a production-like dataset', async () => {
    // ---- Seed (runs after setup.ts truncation, inside this test) --------
    const session: AuthSession = await registerUser('p6-perf-' + Date.now() + '@test.local');

    const custValues: string[] = [];
    const custParams: unknown[] = [];
    for (let i = 0; i < 300; i++) {
      custValues.push(`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`);
      custParams.push(`perf-cust-${i}`, session.workspaceId, `Perf Customer ${i}`, '+23350000' + String(i).padStart(4, '0'));
    }
    await query(
      `INSERT INTO customers (id, workspace_id, full_name, phone) VALUES ${custValues.join(',')}`,
      custParams
    );

    const orderValues: string[] = [];
    const orderParams: unknown[] = [];
    for (let i = 0; i < 200; i++) {
      orderValues.push(`($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`);
      orderParams.push(
        `perf-order-${i}`, session.workspaceId, `perf-cust-${i % 300}`,
        `PERF-${i}`, i % 2 === 0 ? 'in_progress' : 'draft', 50 + (i % 100)
      );
    }
    await query(
      `INSERT INTO orders (id, workspace_id, customer_id, order_number, status, total_amount)
       VALUES ${orderValues.join(',')}`,
      orderParams
    );
    await query(
      `INSERT INTO sync_changes (workspace_id, user_id, table_name, operation, record_id, client_id, payload, occurred_at)
       SELECT $1, $2, 'orders', 'insert', id, gen_random_uuid(), '{}', NOW() FROM orders WHERE id LIKE 'perf-order-%'`,
      [session.workspaceId, session.userId]
    );

    // ---- Health endpoints ----------------------------------------------
    const live = stats(await timed(() => request(app).get('/health/live'), 200));
    const ready = stats(await timed(() => request(app).get('/health/ready'), 100)); // includes DB probe
    results.health = { live, readyWithDbProbe: ready };
    console.log('HEALTH live:', live, '| ready(db probe):', ready);
    expect(live.p95).toBeLessThan(100);
    expect(ready.p95).toBeLessThan(500);

    // ---- Authenticated reads -------------------------------------------
    const customers = stats(await timed(() => asUser(session).get('/customers'), 50));
    results.apiCustomerList300Rows = customers;
    console.log('CUSTOMER LIST (300 rows):', customers);
    expect(customers.p95).toBeLessThan(750);

    const dashboard = stats(await timed(() => asUser(session).get('/dashboard/summary'), 30));
    results.apiDashboardSummary = dashboard;
    console.log('DASHBOARD SUMMARY:', dashboard);
    expect(dashboard.p95).toBeLessThan(1500);

    // ---- Sync ------------------------------------------------------------
    const pull = stats(await timed(() => asUser(session).get('/sync/changes?cursor=0&limit=200'), 30));
    results.syncDeltaPull200 = pull;
    console.log('SYNC DELTA PULL (200 changes):', pull);
    expect(pull.p95).toBeLessThan(1500);

    const batch = Array.from({ length: 50 }, (_, i) => ({
      clientMutationId: randomUUID(),
      entity: 'customers',
      entityId: `perf-mut-cust-${i}`,
      operation: 'insert' as const,
      payload: { id: `perf-mut-cust-${i}`, fullName: `Batch ${i}`, phone: '+233500000000' },
      occurredAt: new Date().toISOString(),
    }));
    const t0 = process.hrtime.bigint();
    const pushRes = await asUser(session).post('/sync/mutations').send({ mutations: batch });
    const batchMs = Number(process.hrtime.bigint() - t0) / 1e6;
    expect(pushRes.status).toBe(207);
    expect(pushRes.body.results.every((r: { status: string }) => r.status === 'applied')).toBe(true);
    results.syncMutationBatch50 = {
      totalMs: Math.round(batchMs * 100) / 100,
      perMutationMs: Math.round((batchMs / 50) * 100) / 100,
    };
    console.log('SYNC MUTATION BATCH (50):', results.syncMutationBatch50);

    // ---- Query plans (EXPLAIN ANALYZE) ---------------------------------
    const plans: Record<string, { indexesPresent: string[]; chosenPlan: string; executionMs: number }> = {};

    const custIdx = await query(
      `SELECT indexname FROM pg_indexes WHERE tablename='customers' AND indexdef ILIKE '%workspace_id%'`
    );
    const custPlan = await query(
      `EXPLAIN (ANALYZE, FORMAT JSON) SELECT id, full_name FROM customers
       WHERE workspace_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
      [session.workspaceId]
    );
    const custElem = ((custPlan.rows[0] as Record<string, unknown>)['QUERY PLAN'] as PlanElement[])[0];
    plans.customerListByWorkspace = {
      indexesPresent: custIdx.rows.map((r) => r.indexname),
      chosenPlan: custElem.Plan ? planChain(custElem.Plan) : '?',
      executionMs: custElem['Execution Time'] ?? -1,
    };

    const syncIdx = await query(
      `SELECT indexname FROM pg_indexes WHERE tablename='sync_changes' AND indexdef ILIKE '%workspace_id%seq%'`
    );
    const syncPlan = await query(
      `EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM sync_changes
       WHERE workspace_id = $1 AND seq > $2 ORDER BY seq ASC LIMIT 200`,
      [session.workspaceId, 0]
    );
    const syncElem = ((syncPlan.rows[0] as Record<string, unknown>)['QUERY PLAN'] as PlanElement[])[0];
    plans.syncDeltaPull = {
      indexesPresent: syncIdx.rows.map((r) => r.indexname),
      chosenPlan: syncElem.Plan ? planChain(syncElem.Plan) : '?',
      executionMs: syncElem['Execution Time'] ?? -1,
    };

    const auditIdx = await query(
      `SELECT indexname FROM pg_indexes WHERE tablename='audit_logs' AND indexdef ILIKE '%workspace_id%'`
    );
    const auditPlan = await query(
      `EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM audit_logs WHERE workspace_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [session.workspaceId]
    );
    const auditElem = ((auditPlan.rows[0] as Record<string, unknown>)['QUERY PLAN'] as PlanElement[])[0];
    plans.auditByWorkspace = {
      indexesPresent: auditIdx.rows.map((r) => r.indexname),
      chosenPlan: auditElem.Plan ? planChain(auditElem.Plan) : '?',
      executionMs: auditElem['Execution Time'] ?? -1,
    };

    results.explainAnalyze = plans;
    console.log('QUERY PLANS:', JSON.stringify(plans));
    // The index inventory must exist (planner may still choose seq scan on
    // small tables — that is correct behavior and is recorded, not failed).
    expect(plans.customerListByWorkspace.indexesPresent.length).toBeGreaterThan(0);
    expect(plans.syncDeltaPull.indexesPresent.length).toBeGreaterThan(0);
    expect(plans.auditByWorkspace.indexesPresent.length).toBeGreaterThan(0);

    // ---- Frontend bundle (from the production build output) -------------
    const dist = path.join(__dirname, '..', '..', 'web', 'dist');
    if (fs.existsSync(dist)) {
      const walk = (dir: string): string[] =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
        );
      const files = walk(dist);
      const sizeOf = (p: string) => fs.statSync(p).size;
      const js = files.filter((f) => f.endsWith('.js'));
      const css = files.filter((f) => f.endsWith('.css'));
      const largest = js.slice().sort((a, b) => sizeOf(b) - sizeOf(a)).slice(0, 3)
        .map((f) => ({ file: path.basename(f), kb: Math.round(sizeOf(f) / 102.4) / 10 }));
      results.frontendBundle = {
        totalKb: Math.round(files.reduce((a, f) => a + sizeOf(f), 0) / 102.4) / 10,
        jsKb: Math.round(js.reduce((a, f) => a + sizeOf(f), 0) / 102.4) / 10,
        cssKb: Math.round(css.reduce((a, f) => a + sizeOf(f), 0) / 102.4) / 10,
        largestJsFiles: largest,
      };
      console.log('FRONTEND BUNDLE:', results.frontendBundle);
    } else {
      results.frontendBundle = 'dist not present in this run';
    }

    results.measuredAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'perf-results.json'), JSON.stringify(results, null, 2));
    console.log('perf results written to tests/perf-results.json');
  }, 180000);
});
