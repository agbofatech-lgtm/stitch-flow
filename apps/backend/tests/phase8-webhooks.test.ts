import http from 'http';
import type { AddressInfo } from 'net';
import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser, type AuthSession } from './helpers';
import { webhookService, verifyWebhookSignature, signWebhookPayload } from '../src/services/webhookService';
import { checkWebhookUrl } from '../src/security/webhookUrlPolicy';

/**
 * Phase 8 — Webhook delivery infrastructure tests.
 * A REAL local HTTP receiver exercises the actual network path (delivery,
 * signatures, retries, dead-letter, replay). Private destinations are
 * allowed under NODE_ENV=test (documented policy) for exactly this purpose.
 */

type ReceivedCall = { headers: http.IncomingHttpHeaders; body: string; at: number };

function startReceiver(responder: (req: http.IncomingMessage, res: http.ServerResponse, body: string) => void) {
  const calls: ReceivedCall[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      calls.push({ headers: req.headers, body, at: Date.now() });
      responder(req, res, body);
    });
  });
  return new Promise<{ server: http.Server; url: string; calls: ReceivedCall[] }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}/hook`, calls });
    });
  });
}

async function pollUntil(conditionFn: () => Promise<boolean>, timeoutMs = 8000, intervalMs = 100): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await conditionFn()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return await conditionFn();
}

let receiver: Awaited<ReturnType<typeof startReceiver>>;

beforeEach(async () => {
  await query(`UPDATE feature_flags SET enabled = true WHERE flag_key = 'WEBHOOK_MANAGEMENT'`);
});

afterAll(async () => {
  // Deterministic drain settle; then close the receiver (no hanging handles).
  try { await webhookService.drainOnce(); } catch { /* best-effort */ }
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (receiver) await new Promise((resolve) => receiver.server.close(resolve));
});

async function createEndpoint(session: AuthSession, url: string, events: string[] = ['@all'], extra: Record<string, unknown> = {}) {
  const res = await asUser(session).post('/webhooks/endpoints').send({ url, subscribedEvents: events, ...extra });
  if (res.status !== 201) throw new Error(`endpoint create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { endpoint: res.body.endpoint, secret: res.body.secret as string };
}

async function emitEvent(ws: string, eventType: string, entityId: string, payload: Record<string, unknown> = {}) {
  const r = await query(
    `INSERT INTO integration_outbox (workspace_id, event_type, entity_type, entity_id, payload)
     VALUES ($1,$2,'test',$3,$4) RETURNING outbox_id`,
    [ws, eventType, entityId, JSON.stringify(payload)]
  );
  return r.rows[0].outbox_id as string;
}

describe('Phase 8 — signature scheme', () => {
  const secret = 'whsec_unit_test_secret_value';
  const body = JSON.stringify({ eventType: 'X', hello: 'world' });

  it('signs deterministically as t=…,v1=HMAC-SHA256(t.body) and verifies', () => {
    const header = signWebhookPayload(secret, body, 1700000000);
    expect(header).toMatch(/^t=1700000000,v1=[a-f0-9]{64}$/);
    const ok = verifyWebhookSignature(secret, header, body, { now: 1700000100 });
    expect(ok.ok).toBe(true);
  });

  it('rejects tampered bodies (WEBHOOK_SIGNATURE_INVALID)', () => {
    const header = signWebhookPayload(secret, body, 1700000000);
    const bad = verifyWebhookSignature(secret, header, body.replace('world', 'attacker'), { now: 1700000100 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe('WEBHOOK_SIGNATURE_INVALID');
  });

  it('rejects stale timestamps (WEBHOOK_REPLAY_REJECTED) and malformed headers', () => {
    const stale = signWebhookPayload(secret, body, 1700000000);
    const rejected = verifyWebhookSignature(secret, stale, body, { now: 1700000000 + 301 });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.code).toBe('WEBHOOK_REPLAY_REJECTED');
    const malformed = verifyWebhookSignature(secret, 'garbage', body);
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.code).toBe('WEBHOOK_SIGNATURE_INVALID');
  });
});

describe('Phase 8 — SSRF URL policy', () => {
  it('rejects private/loopback/metadata destinations in production mode', () => {
    for (const url of [
      'http://127.0.0.1:8080/hook',
      'http://localhost/hook',
      'http://0.0.0.0/hook',
      'http://10.1.2.3/hook',
      'http://172.16.5.4/hook',
      'http://192.168.1.10/hook',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/hook',
      'http://[fd00::1]/hook',
      'http://metadata.google.internal/computeMetadata/v1',
      'http://100.64.0.9/hook',
    ]) {
      const check = checkWebhookUrl(url, { allowPrivate: false });
      expect({ url, ok: check.ok }).toEqual({ url, ok: false });
    }
  });

  it('allows private destinations when explicitly permitted (test mode)', () => {
    expect(checkWebhookUrl('http://127.0.0.1:9/hook', { allowPrivate: true }).ok).toBe(true);
  });

  it('rejects malformed URLs, non-http schemes, and embedded credentials', () => {
    expect(checkWebhookUrl('not a url', { allowPrivate: true }).ok).toBe(false);
    expect(checkWebhookUrl('ftp://example.com/x', { allowPrivate: true }).ok).toBe(false);
    expect(checkWebhookUrl('http://user:pass@example.com/x', { allowPrivate: true }).ok).toBe(false);
    expect(checkWebhookUrl('https://example.com/webhook', { allowPrivate: false }).ok).toBe(true);
  });
});

describe('Phase 8 — endpoint lifecycle', () => {
  it('fails closed while WEBHOOK_MANAGEMENT is OFF', async () => {
    await query(`UPDATE feature_flags SET enabled = false WHERE flag_key = 'WEBHOOK_MANAGEMENT'`);
    const s = await registerUser('wh-flag-off@t.test');
    const res = await asUser(s).post('/webhooks/endpoints').send({ url: 'https://example.com/hook', subscribedEvents: ['@all'] });
    expect(res.status).toBe(403);
  });

  it('creates an endpoint with a ONE-TIME whsec_ secret that is never stored plaintext', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(200).end('ok'));
    const s = await registerUser('wh-maker@t.test');
    const { endpoint, secret } = await createEndpoint(s, receiver.url);
    expect(secret).toMatch(/^whsec_[A-Za-z0-9_-]+$/);
    expect(endpoint.secret_prefix).toMatch(/^whsec_/);
    // Nothing in storage contains the raw secret
    const row = await query(`SELECT secret_encrypted, secret_prefix FROM webhook_endpoints WHERE id = $1`, [endpoint.id]);
    expect(row.rows[0].secret_encrypted).not.toContain(secret.slice(6));
    expect(row.rows[0].secret_encrypted).toMatch(/^v1\./);
    // Listing never returns secret material
    const list = await asUser(s).get('/webhooks/endpoints');
    expect(JSON.stringify(list.body)).not.toContain(secret);
    // Audited
    const audit = await query(`SELECT action FROM audit_logs WHERE entity_type = 'webhook_endpoint' AND entity_id = $1`, [endpoint.id]);
    expect(audit.rows.map((r) => r.action)).toContain('webhook_endpoint.created');
  });

  it('rejects malformed registrations (URL, events, retry policy)', async () => {
    const s = await registerUser('wh-bad@t.test');
    expect((await asUser(s).post('/webhooks/endpoints').send({ url: 'not-a-url', subscribedEvents: ['@all'] })).status).toBe(400);
    expect((await asUser(s).post('/webhooks/endpoints').send({ url: 'https://ok.example/hook', subscribedEvents: [] })).status).toBe(400);
    expect((await asUser(s).post('/webhooks/endpoints').send({ url: 'https://ok.example/hook', subscribedEvents: ['bad event!'] })).status).toBe(400);
    expect((await asUser(s).post('/webhooks/endpoints').send({ url: 'https://ok.example/hook', subscribedEvents: ['@all'], maxAttempts: 99 })).status).toBe(400);
    expect((await asUser(s).post('/webhooks/endpoints').send({ url: 'https://ok.example/hook', subscribedEvents: ['@all'], backoffBaseSeconds: -5 })).status).toBe(400);
  });

  it('disables, edits, and deletes endpoints (workspace-scoped, audited)', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(200).end('ok'));
    const s = await registerUser('wh-edit@t.test');
    const { endpoint } = await createEndpoint(s, receiver.url, ['ORDER_CREATED']);
    const disabled = await asUser(s).patch(`/webhooks/endpoints/${endpoint.id}`).send({ status: 'disabled' });
    expect(disabled.status).toBe(200);
    expect(disabled.body.status).toBe('disabled');
    const edited = await asUser(s).patch(`/webhooks/endpoints/${endpoint.id}`).send({ subscribedEvents: ['@all'] });
    expect(edited.status).toBe(200);
    const deleted = await asUser(s).delete(`/webhooks/endpoints/${endpoint.id}`);
    expect(deleted.status).toBe(200);
    expect((await asUser(s).get('/webhooks/endpoints')).body).toHaveLength(0);
    const audit = await query(`SELECT action FROM audit_logs WHERE entity_type = 'webhook_endpoint' AND entity_id = $1`, [endpoint.id]);
    const actions = audit.rows.map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(['webhook_endpoint.updated', 'webhook_endpoint.deleted']));
  });

  it('keeps endpoints tenant-isolated (cross-workspace patch/delete → 404)', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(200).end('ok'));
    const a = await registerUser('wh-iso-a@t.test');
    const b = await registerUser('wh-iso-b@t.test');
    const { endpoint } = await createEndpoint(a, receiver.url);
    expect((await asUser(b).patch(`/webhooks/endpoints/${endpoint.id}`).send({ status: 'disabled' })).status).toBe(404);
    expect((await asUser(b).delete(`/webhooks/endpoints/${endpoint.id}`)).status).toBe(404);
    expect((await asUser(b).get('/webhooks/endpoints')).body).toHaveLength(0);
  });

  it('rejects API keys, portal tokens and anonymous callers (staff JWT only)', async () => {
    const s = await registerUser('wh-auth@t.test');
    expect((await request(app).get('/webhooks/endpoints')).status).toBe(401);
    expect((await request(app).get('/webhooks/endpoints').set('Authorization', 'Bearer sf_live_fortythreecharspaddingpaddingpadding')).status).toBe(401);
  });
});

describe('Phase 8 — delivery pipeline (real network path)', () => {
  it('delivers an outbox event with a verifiable signature and records the outcome', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(200).end('ok'));
    const s = await registerUser('wh-deliver@t.test');
    const { endpoint, secret } = await createEndpoint(s, receiver.url, ['REFERRAL_CONVERTED']);
    const outboxId = await emitEvent(s.workspaceId!, 'REFERRAL_CONVERTED', `ref-${Date.now()}`, { state: 'CONVERTED' });

    await webhookService.dispatchOutbox();
    await webhookService.drainOnce();
    const got = await pollUntil(async () => receiver.calls.length >= 1);
    expect(got).toBe(true);

    const call = receiver.calls[0];
    // Signature verifies against the one-time secret the customer saved
    const verification = verifyWebhookSignature(secret, String(call.headers['x-stitchflow-signature']), call.body);
    expect(verification.ok).toBe(true);
    // Envelope + headers
    const envelope = JSON.parse(call.body);
    expect(envelope.eventType).toBe('REFERRAL_CONVERTED');
    expect(envelope.workspaceId).toBe(s.workspaceId);
    expect(call.headers['x-stitchflow-event']).toBe('REFERRAL_CONVERTED');
    expect(String(call.headers['x-stitchflow-delivery'])).toMatch(/^[0-9a-f-]{36}$/);
    // Delivery row recorded with response details
    const delivery = await query(`SELECT * FROM webhook_deliveries WHERE outbox_id = $1`, [outboxId]);
    expect(delivery.rows[0].status).toBe('DELIVERED');
    expect(delivery.rows[0].response_status).toBe(200);
    expect(Number(delivery.rows[0].response_time_ms)).toBeGreaterThanOrEqual(0);
    // Outbox marked dispatched; endpoint health updated
    const outbox = await query(`SELECT status FROM integration_outbox WHERE outbox_id = $1`, [outboxId]);
    expect(outbox.rows[0].status).toBe('DISPATCHED');
    const ep = await query(`SELECT last_delivery_at, failure_count FROM webhook_endpoints WHERE id = $1`, [endpoint.id]);
    expect(ep.rows[0].last_delivery_at).not.toBeNull();
    expect(ep.rows[0].failure_count).toBe(0);
  });

  it('respects event filtering (non-subscribed events are not delivered) and skips subscriber-less outbox rows', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(200).end('ok'));
    const s = await registerUser('wh-filter@t.test');
    await createEndpoint(s, receiver.url, ['ORDER_CREATED']);
    const outboxId = await emitEvent(s.workspaceId!, 'SOME_OTHER_EVENT', `x-${Date.now()}`);
    await webhookService.dispatchOutbox();
    await webhookService.drainOnce();
    expect(receiver.calls.length).toBe(0);
    // No subscribers ⇒ outbox SKIPPED (never stuck PENDING)
    const outbox = await query(`SELECT status FROM integration_outbox WHERE outbox_id = $1`, [outboxId]);
    expect(outbox.rows[0].status).toBe('SKIPPED');
  });

  it('is idempotent: double dispatch creates exactly one delivery', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(200).end('ok'));
    const s = await registerUser('wh-idem@t.test');
    await createEndpoint(s, receiver.url);
    const outboxId = await emitEvent(s.workspaceId!, 'IDEM_TEST', `i-${Date.now()}`);
    await webhookService.dispatchOutbox();
    await webhookService.dispatchOutbox(); // duplicate drain
    const deliveries = await query(`SELECT COUNT(*)::int AS n FROM webhook_deliveries WHERE outbox_id = $1`, [outboxId]);
    expect(deliveries.rows[0].n).toBe(1);
  });

  it('retries transient 5xx with exponential backoff and succeeds (attempts recorded per row)', async () => {
    let failures = 0;
    receiver = await startReceiver((_req, res) => {
      failures++;
      if (failures <= 2) res.writeHead(500).end('boom');
      else res.writeHead(200).end('ok');
    });
    const s = await registerUser('wh-retry@t.test');
    await createEndpoint(s, receiver.url, ['RETRY_TEST'], { maxAttempts: 5, backoffBaseSeconds: 0 });
    await emitEvent(s.workspaceId!, 'RETRY_TEST', `r-${Date.now()}`);

    const done = await pollUntil(async () => {
      await webhookService.dispatchOutbox();
      await webhookService.drainOnce();
      const r = await query(`SELECT status FROM webhook_deliveries WHERE event_type = 'RETRY_TEST' ORDER BY attempt DESC LIMIT 1`);
      return r.rows[0]?.status === 'DELIVERED';
    }, 10000, 150);
    expect(done).toBe(true);
    const rows = await query(`SELECT attempt, status, response_status FROM webhook_deliveries WHERE event_type = 'RETRY_TEST' ORDER BY attempt`);
    expect(rows.rows.length).toBe(3); // attempts 1,2 failed; 3 delivered
    expect(rows.rows.map((r) => r.status)).toEqual(['RETRYING', 'RETRYING', 'DELIVERED']);
    expect(receiver.calls.length).toBe(3);
  });

  it('dead-letters after exhausting retries (bounded, no infinite loop)', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(500).end('always broken'));
    const s = await registerUser('wh-dl@t.test');
    await createEndpoint(s, receiver.url, ['DL_TEST'], { maxAttempts: 3, backoffBaseSeconds: 0 });
    await emitEvent(s.workspaceId!, 'DL_TEST', `d-${Date.now()}`);

    const done = await pollUntil(async () => {
      await webhookService.dispatchOutbox();
      await webhookService.drainOnce();
      const r = await query(`SELECT COUNT(*)::int AS n FROM webhook_deliveries WHERE event_type = 'DL_TEST' AND status = 'DEAD_LETTER'`);
      return r.rows[0].n === 1;
    }, 10000, 150);
    expect(done).toBe(true);
    const rows = await query(`SELECT attempt, status, failure_reason FROM webhook_deliveries WHERE event_type = 'DL_TEST' ORDER BY attempt`);
    expect(rows.rows.length).toBe(3); // hard-bounded at maxAttempts=3
    expect(rows.rows[2].status).toBe('DEAD_LETTER');
    expect(rows.rows[2].failure_reason).toContain('attempts-exhausted');
    const ep = await query(`SELECT failure_count FROM webhook_endpoints WHERE url = $1`, [receiver.url]);
    expect(Number(ep.rows[0].failure_count)).toBe(3);
  });

  it('dead-letters permanent 4xx immediately (no pointless retries)', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(410).end('gone'));
    const s = await registerUser('wh-perm@t.test');
    await createEndpoint(s, receiver.url, ['PERM_TEST'], { maxAttempts: 5, backoffBaseSeconds: 0 });
    await emitEvent(s.workspaceId!, 'PERM_TEST', `p-${Date.now()}`);
    await webhookService.dispatchOutbox();
    await webhookService.drainOnce();
    const rows = await query(`SELECT attempt, status, failure_reason FROM webhook_deliveries WHERE event_type = 'PERM_TEST'`);
    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].status).toBe('DEAD_LETTER');
    expect(rows.rows[0].failure_reason).toContain('permanent');
    expect(receiver.calls.length).toBe(1);
  });

  it('handles receiver timeouts as transient failures', async () => {
    process.env.WEBHOOK_DELIVERY_TIMEOUT_MS = '250';
    receiver = await startReceiver((_req, res) => { setTimeout(() => res.writeHead(200).end('late'), 2000); });
    const s = await registerUser('wh-timeout@t.test');
    await createEndpoint(s, receiver.url, ['TIMEOUT_TEST'], { maxAttempts: 2, backoffBaseSeconds: 0 });
    await emitEvent(s.workspaceId!, 'TIMEOUT_TEST', `t-${Date.now()}`);
    await webhookService.dispatchOutbox();
    await webhookService.drainOnce();
    const rows = await query(`SELECT status, failure_reason FROM webhook_deliveries WHERE event_type = 'TIMEOUT_TEST' ORDER BY attempt`);
    expect(rows.rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.rows[0].status).toBe('RETRYING');
    expect(rows.rows[0].failure_reason).toContain('timeout');
    delete process.env.WEBHOOK_DELIVERY_TIMEOUT_MS;
  });

  it('replays a dead letter as a NEW attempt without corrupting history', async () => {
    let broken = true;
    receiver = await startReceiver((_req, res) => {
      if (broken) res.writeHead(500).end('broken');
      else res.writeHead(200).end('fixed');
    });
    const s = await registerUser('wh-replay@t.test');
    await createEndpoint(s, receiver.url, ['REPLAY_TEST'], { maxAttempts: 1, backoffBaseSeconds: 0 });
    await emitEvent(s.workspaceId!, 'REPLAY_TEST', `rp-${Date.now()}`);
    await webhookService.dispatchOutbox();
    await webhookService.drainOnce();
    const dead = await query(`SELECT id, attempt, status FROM webhook_deliveries WHERE event_type = 'REPLAY_TEST' AND status = 'DEAD_LETTER'`);
    expect(dead.rows).toHaveLength(1);
    const deadId = dead.rows[0].id;

    // Cross-tenant replay is rejected…
    const other = await registerUser('wh-replay-other@t.test');
    expect((await asUser(other).post(`/webhooks/dead-letters/${deadId}/replay`)).status).toBe(404);
    // …owner replay works after the receiver is fixed
    broken = false;
    const replay = await asUser(s).post(`/webhooks/dead-letters/${deadId}/replay`);
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);
    const done = await pollUntil(async () => {
      await webhookService.drainOnce();
      const r = await query(`SELECT status FROM webhook_deliveries WHERE event_type = 'REPLAY_TEST' AND attempt = 2`);
      return r.rows[0]?.status === 'DELIVERED';
    });
    expect(done).toBe(true);
    // History preserved: attempt-1 row is STILL the original DEAD_LETTER
    const first = await query(`SELECT status FROM webhook_deliveries WHERE id = $1`, [deadId]);
    expect(first.rows[0].status).toBe('DEAD_LETTER');
    const audit = await query(`SELECT action FROM audit_logs WHERE entity_type = 'webhook_delivery' AND entity_id = $1`, [deadId]);
    expect(audit.rows.map((r) => r.action)).toContain('webhook_dead_letter.replayed');
  });

  it('sends a test event through the REAL pipeline', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(200).end('ok'));
    const s = await registerUser('wh-test-evt@t.test');
    const { endpoint } = await createEndpoint(s, receiver.url);
    const res = await asUser(s).post(`/webhooks/endpoints/${endpoint.id}/test`);
    expect(res.status).toBe(202);
    const got = await pollUntil(async () => receiver.calls.some((c) => c.headers['x-stitchflow-event'] === 'webhook.test'));
    expect(got).toBe(true);
  });

  it('isolates deliveries per tenant (lists + dead letters)', async () => {
    receiver = await startReceiver((_req, res) => res.writeHead(410).end('gone'));
    const a = await registerUser('wh-dl-iso-a@t.test');
    const b = await registerUser('wh-dl-iso-b@t.test');
    await createEndpoint(a, receiver.url, ['ISO_DL']);
    await emitEvent(a.workspaceId!, 'ISO_DL', `ia-${Date.now()}`);
    await webhookService.dispatchOutbox();
    await webhookService.drainOnce();
    const listA = await asUser(a).get('/webhooks/deliveries?status=DEAD_LETTER');
    expect(listA.body.length).toBeGreaterThanOrEqual(1);
    const listB = await asUser(b).get('/webhooks/deliveries?status=DEAD_LETTER');
    expect(listB.body).toHaveLength(0);
    const dlB = await asUser(b).get('/webhooks/dead-letters');
    expect(dlB.body).toHaveLength(0);
  });
});
