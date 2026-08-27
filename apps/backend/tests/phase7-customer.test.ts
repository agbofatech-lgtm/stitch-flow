/**
 * Phase 7 — Customer foundation + Growth: CRM (notes/preferences/timeline/
 * segments), referrals, appointments, fittings, fit observations.
 * Covers CRUD, validation, state machines, idempotency, concurrency-safe
 * attribution, tenant isolation, and hook-generated timeline events.
 */
import request from 'supertest';
import { app } from '../src/app';
import { query } from '../src/config/db';
import { registerUser, asUser, type AuthSession } from './helpers';

// Best-effort timeline writes (void-promises in routes) must settle before
// the suite's pool is ended / Postgres is torn down, otherwise the in-flight
// client receives the shutdown FATAL (57P01) and crashes the worker.
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 750));
});

async function makeCustomer(session: AuthSession, name = 'Phase Seven', phone = '+233511000001') {
  const res = await asUser(session).post('/customers').send({ fullName: name, phone });
  if (res.status !== 201) throw new Error(`customer create failed: ${res.status}`);
  return res.body;
}

describe('Phase 7 — CRM notes', () => {
  it('creates, lists and soft-deletes notes with validation', async () => {
    const session = await registerUser('p7-notes-' + Date.now() + '@test.local');
    const customer = await makeCustomer(session);

    const bad = await asUser(session).post('/crm/notes').send({ customerId: customer.id, note: '', category: 'GENERAL' });
    expect(bad.status).toBe(400);
    const badCat = await asUser(session).post('/crm/notes').send({ customerId: customer.id, note: 'x', category: 'NOPE' });
    expect(badCat.status).toBe(400);

    const created = await asUser(session)
      .post('/crm/notes')
      .send({ customerId: customer.id, note: 'Prefers fitted sleeves', category: 'FIT' });
    expect(created.status).toBe(201);
    expect(created.body.category).toBe('FIT');
    expect(created.body.author_user_id).toBe(session.userId);

    const listed = await asUser(session).get(`/crm/notes/${customer.id}`);
    expect(listed.body.length).toBe(1);

    const gone = await asUser(session).delete(`/crm/notes/${created.body.id}`);
    expect(gone.status).toBe(200);
    const after = await asUser(session).get(`/crm/notes/${customer.id}`);
    expect(after.body.length).toBe(0);
  });

  it('notes are tenant-isolated (B never sees A notes, foreign customer 404)', async () => {
    const a = await registerUser('p7-notes-a-' + Date.now() + '@test.local');
    const b = await registerUser('p7-notes-b-' + Date.now() + '@test.local');
    const customer = await makeCustomer(a);
    const note = await asUser(a).post('/crm/notes').send({ customerId: customer.id, note: 'private', category: 'GENERAL' });
    expect(note.status).toBe(201);

    // B cannot attach a note to A's customer (tenant guard).
    const cross = await asUser(b).post('/crm/notes').send({ customerId: customer.id, note: 'intrusion', category: 'GENERAL' });
    expect(cross.status).toBe(404);
    // B sees nothing of A.
    const list = await asUser(b).get(`/crm/notes/${customer.id}`);
    expect(list.body.length).toBe(0);
  });
});

describe('Phase 7 — customer preferences', () => {
  it('absence means NO consent (never inferred); explicit consent is timestamped', async () => {
    const session = await registerUser('p7-pref-' + Date.now() + '@test.local');
    const customer = await makeCustomer(session);

    const initial = await asUser(session).get(`/crm/preferences/${customer.id}`);
    expect(initial.status).toBe(200);
    expect(initial.body.marketing_consent ?? initial.body.marketingConsent).toBeFalsy();

    const saved = await asUser(session)
      .put(`/crm/preferences/${customer.id}`)
      .send({ preferredContactMethod: 'whatsapp', marketingConsent: true, stylePreferences: { colors: ['navy'] } });
    expect(saved.status).toBe(200);
    expect(saved.body.marketing_consent).toBe(true);
    expect(saved.body.marketing_consent_at).toBeTruthy();

    const revoked = await asUser(session)
      .put(`/crm/preferences/${customer.id}`)
      .send({ preferredContactMethod: 'sms', marketingConsent: false });
    expect(revoked.body.marketing_consent).toBe(false);
    expect(revoked.body.marketing_consent_at).toBeNull();

    const invalid = await asUser(session)
      .put(`/crm/preferences/${customer.id}`)
      .send({ preferredContactMethod: 'fax' });
    expect(invalid.status).toBe(400);
  });
});

describe('Phase 7 — customer timeline', () => {
  it('records business events from existing flows (customer/order/payment) and lists them', async () => {
    const session = await registerUser('p7-tl-' + Date.now() + '@test.local');
    const customer = await makeCustomer(session, 'Timeline Client');

    const order = await asUser(session).post('/orders').send({
      customerId: customer.id, orderNumber: 'P7-ORD-1', orderType: 'custom', totalAmount: 100, status: 'draft',
    });
    expect(order.status).toBe(201);
    await asUser(session).put(`/orders/${order.body.id}`).send({
      customerId: customer.id, orderNumber: 'P7-ORD-1', orderType: 'custom', totalAmount: 100, status: 'confirmed',
    });

    // Give best-effort timeline writes a beat to land.
    await new Promise((r) => setTimeout(r, 150));

    const invoice = await asUser(session).post('/invoices').send({
      customerId: customer.id, orderId: order.body.id, invoiceNumber: 'P7-INV-1', totalAmount: 100,
    });
    expect(invoice.status).toBe(201);
    const payment = await asUser(session).post('/payments').send({
      invoiceId: invoice.body.id, customerId: customer.id, amount: 40, method: 'cash', referenceCode: 'P7-REF-1',
    });
    expect(payment.status).toBe(201);
    await new Promise((r) => setTimeout(r, 150));

    const timeline = await asUser(session).get(`/crm/timeline/${customer.id}`);
    expect(timeline.status).toBe(200);
    const types = timeline.body.entries.map((e: { event_type: string }) => e.event_type);
    expect(types).toContain('CUSTOMER_CREATED');
    expect(types).toContain('ORDER_CREATED');
    expect(types).toContain('ORDER_STATUS_CHANGED');
    expect(types).toContain('PAYMENT_RECORDED');
  });

  it('timeline is tenant-isolated', async () => {
    const a = await registerUser('p7-tl-a-' + Date.now() + '@test.local');
    const b = await registerUser('p7-tl-b-' + Date.now() + '@test.local');
    const customer = await makeCustomer(a);
    await new Promise((r) => setTimeout(r, 150));
    const foreign = await asUser(b).get(`/crm/timeline/${customer.id}`);
    expect(foreign.status).toBe(200);
    expect(foreign.body.entries.length).toBe(0);
  });
});

describe('Phase 7 — segments', () => {
  it('derives segments from authoritative data (new/repeat/vip/appointment-due) without storing them', async () => {
    const session = await registerUser('p7-seg-' + Date.now() + '@test.local');
    const fresh = await makeCustomer(session, 'Fresh Customer');
    const loyal = await makeCustomer(session, 'Loyal Customer', '+233511000002');

    for (let i = 0; i < 2; i++) {
      const order = await asUser(session).post('/orders').send({
        customerId: loyal.id, orderNumber: `SEG-${i}`, orderType: 'custom', totalAmount: 300,
      });
      expect(order.status).toBe(201);
      const invoice = await asUser(session).post('/invoices').send({
        customerId: loyal.id, orderId: order.body.id, invoiceNumber: `SEGI-${i}`, totalAmount: 300,
      });
      const payment = await asUser(session).post('/payments').send({
        invoiceId: invoice.body.id, customerId: loyal.id, amount: 300, method: 'cash', referenceCode: `SEGP-${i}`,
      });
      expect(payment.status).toBe(201);
    }

    const appt = await asUser(session).post('/appointments').send({
      customerId: fresh.id, appointmentType: 'FITTING',
      startAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 3 * 86400000 + 3600000).toISOString(),
    });
    expect(appt.status).toBe(201);

    const segments = await asUser(session).get('/crm/segments');
    expect(segments.status).toBe(200);
    const byId = new Map<string, Record<string, unknown>>(segments.body.customers.map((c: { id: string }) => [c.id, c] as [string, Record<string, unknown>]));
    expect(byId.get(fresh.id)!.seg_new).toBe(true);
    expect(byId.get(fresh.id)!.seg_appointment_due).toBe(true);
    expect(byId.get(loyal.id)!.seg_repeat).toBe(true);
    expect(byId.get(loyal.id)!.seg_high_value).toBe(true); // 600 total
    expect(byId.get(loyal.id)!.seg_vip).toBe(false); // < 1000
  });
});

describe('Phase 7 — referrals', () => {
  it('creates with generated code; duplicate clientMutationId replays the original (idempotent attribution)', async () => {
    const session = await registerUser('p7-ref-' + Date.now() + '@test.local');
    const referrer = await makeCustomer(session, 'Referrer');
    const referred = await makeCustomer(session, 'Referred', '+233511000003');

    const first = await asUser(session).post('/referrals').send({
      referrerCustomerId: referrer.id, referredCustomerId: referred.id, clientMutationId: '11111111-1111-4111-8111-111111111111',
    });
    expect(first.status).toBe(201);
    expect(first.body.status).toBe('CREATED');

    const replay = await asUser(session).post('/referrals').send({
      referrerCustomerId: referrer.id, referredCustomerId: referred.id, clientMutationId: '11111111-1111-4111-8111-111111111111',
    });
    expect(replay.status).toBe(200);
    expect(replay.body.duplicate).toBe(true);
    expect(replay.body.id).toBe(first.body.id);

    const count = await query(`SELECT COUNT(*)::int AS n FROM referrals`);
    expect(count.rows[0].n).toBe(1); // attribution counted ONCE
  });

  it('walks CREATED -> INVITED -> REGISTERED -> CONVERTED and rejects illegal jumps', async () => {
    const session = await registerUser('p7-ref2-' + Date.now() + '@test.local');
    const referrer = await makeCustomer(session, 'Referrer 2');
    const referral = await asUser(session).post('/referrals').send({ referrerCustomerId: referrer.id });
    expect(referral.status).toBe(201);
    const id = referral.body.id;

    expect((await asUser(session).post(`/referrals/${id}/invite`)).body.status).toBe('INVITED');
    expect((await asUser(session).post(`/referrals/${id}/register`)).body.status).toBe('REGISTERED');
    // Illegal: REGISTERED -> REWARDED without CONVERTED.
    const illegal = await asUser(session).post(`/referrals/${id}/reward`);
    expect(illegal.status).toBe(409);
    expect(illegal.body.error.code).toBe('INVALID_REFERRAL_STATE');
    const converted = await asUser(session).post(`/referrals/${id}/convert`);
    expect(converted.body.status).toBe('CONVERTED');
    expect(converted.body.converted_at).toBeTruthy();

    const tl = await asUser(session).get(`/crm/timeline/${referrer.id}`);
    expect(tl.body.entries.map((e: { event_type: string }) => e.event_type)).toContain('REFERRAL_CREATED');
  });

  it('a referred customer cannot be attributed twice, and cross-workspace referral is rejected', async () => {
    const a = await registerUser('p7-ref3-a-' + Date.now() + '@test.local');
    const b = await registerUser('p7-ref3-b-' + Date.now() + '@test.local');
    const referrerA = await makeCustomer(a, 'A Referrer');
    const referredA = await makeCustomer(a, 'A Referred', '+233511000004');
    const customerB = await makeCustomer(b, 'B Customer', '+233511000005');

    const first = await asUser(a).post('/referrals').send({ referrerCustomerId: referrerA.id, referredCustomerId: referredA.id });
    expect(first.status).toBe(201);
    // Same referred customer again (different mutation id) -> uniqueness violation surfaced as 409/500, NOT a second row.
    const second = await asUser(a).post('/referrals').send({ referrerCustomerId: referrerA.id, referredCustomerId: referredA.id, clientMutationId: '22222222-2222-4222-8222-222222222222' });
    expect([409, 500]).toContain(second.status);
    const count = await query(`SELECT COUNT(*)::int AS n FROM referrals`);
    expect(count.rows[0].n).toBe(1);

    // B's customer cannot be referred inside A's workspace.
    const cross = await asUser(a).post('/referrals').send({ referrerCustomerId: referrerA.id, referredCustomerId: customerB.id });
    expect(cross.status).toBe(404);

    // B cannot read or transition A's referral.
    expect((await asUser(b).get(`/referrals/${first.body.id}`)).status).toBe(404);
    expect((await asUser(b).post(`/referrals/${first.body.id}/convert`)).status).toBe(404);
  });
});

describe('Phase 7 — appointments & fittings', () => {
  const startAt = new Date(Date.now() + 86400000).toISOString();
  const endAt = new Date(Date.now() + 86400000 + 3600000).toISOString();

  it('creates appointments with validation, idempotency and staff conflict detection', async () => {
    const session = await registerUser('p7-appt-' + Date.now() + '@test.local');
    const customer = await makeCustomer(session, 'Appt Client');

    const bad = await asUser(session).post('/appointments').send({ customerId: customer.id, startAt, endAt, appointmentType: 'MASSAGE' });
    expect(bad.status).toBe(400);
    const inverted = await asUser(session).post('/appointments').send({ customerId: customer.id, startAt: endAt, endAt: startAt });
    expect(inverted.status).toBe(400);

    const first = await asUser(session).post('/appointments').send({
      customerId: customer.id, appointmentType: 'MEASUREMENT', startAt, endAt,
      assignedMemberId: session.userId, clientMutationId: '33333333-3333-4333-8333-333333333333',
    });
    expect(first.status).toBe(201);
    expect(first.body.status).toBe('SCHEDULED');

    const replay = await asUser(session).post('/appointments').send({
      customerId: customer.id, appointmentType: 'MEASUREMENT', startAt, endAt,
      assignedMemberId: session.userId, clientMutationId: '33333333-3333-4333-8333-333333333333',
    });
    expect(replay.status).toBe(200);
    expect(replay.body.duplicate).toBe(true);

    // Same staff, overlapping window -> conflict (different mutation id).
    const clash = await asUser(session).post('/appointments').send({
      customerId: customer.id, appointmentType: 'FITTING',
      startAt: new Date(Date.now() + 86400000 + 1800000).toISOString(),
      endAt: new Date(Date.now() + 86400000 + 5400000).toISOString(),
      assignedMemberId: session.userId, clientMutationId: '44444444-4444-4444-8444-444444444444',
    });
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe('APPOINTMENT_CONFLICT');

    // Another staff member is free.
    const free = await asUser(session).post('/appointments').send({
      customerId: customer.id, appointmentType: 'FITTING', startAt, endAt,
      assignedMemberId: null, clientMutationId: '55555555-5555-4555-8555-555555555555',
    });
    expect(free.status).toBe(201);
  });

  it('reschedules, completes and enforces terminal states with timeline events', async () => {
    const session = await registerUser('p7-appt2-' + Date.now() + '@test.local');
    const customer = await makeCustomer(session, 'Appt Client 2');
    const appt = await asUser(session).post('/appointments').send({
      customerId: customer.id, appointmentType: 'CONSULTATION', startAt, endAt,
    });
    const id = appt.body.id;

    const confirmed = await asUser(session).patch(`/appointments/${id}`).send({ status: 'CONFIRMED' });
    expect(confirmed.body.status).toBe('CONFIRMED');

    const rescheduled = await asUser(session).patch(`/appointments/${id}`).send({
      startAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(),
    });
    expect(rescheduled.body.status).toBe('RESCHEDULED');

    const done = await asUser(session).patch(`/appointments/${id}`).send({ status: 'COMPLETED' });
    expect(done.body.status).toBe('COMPLETED');
    // Terminal: no further transitions.
    const zombie = await asUser(session).patch(`/appointments/${id}`).send({ status: 'CANCELLED' });
    expect(zombie.status).toBe(409);

    await new Promise((r) => setTimeout(r, 150));
    const tl = await asUser(session).get(`/crm/timeline/${customer.id}`);
    const types = tl.body.entries.map((e: { event_type: string }) => e.event_type);
    expect(types).toContain('APPOINTMENT_CREATED');
    expect(types).toContain('APPOINTMENT_RESCHEDULED');
    expect(types).toContain('APPOINTMENT_COMPLETED');
  });

  it('fitsting workflow with structured observations follows the legal state flow', async () => {
    const session = await registerUser('p7-fit-' + Date.now() + '@test.local');
    const customer = await makeCustomer(session, 'Fit Client');
    const fitting = await asUser(session).post('/appointments/fittings').send({ customerId: customer.id });
    expect(fitting.status).toBe(201);
    expect(fitting.body.status).toBe('PENDING');
    const id = fitting.body.id;

    // Illegal jump PENDING -> COMPLETED.
    expect((await asUser(session).patch(`/appointments/fittings/${id}/status`).send({ status: 'COMPLETED' })).status).toBe(409);

    expect((await asUser(session).patch(`/appointments/fittings/${id}/status`).send({ status: 'IN_FITTING' })).body.status).toBe('IN_FITTING');
    const alt = await asUser(session).patch(`/appointments/fittings/${id}/status`).send({ status: 'ALTERATIONS_REQUIRED', alterationsNotes: 'Take in waist 1cm' });
    expect(alt.body.status).toBe('ALTERATIONS_REQUIRED');
    expect(alt.body.alterations_required).toBe(true);

    const obs = await asUser(session).post(`/appointments/fittings/${id}/observations`).send({
      observationCode: 'loose_waist', severity: 'moderate', note: '1cm ease at waist',
    });
    expect(obs.status).toBe(201);
    const badObs = await asUser(session).post(`/appointments/fittings/${id}/observations`).send({ observationCode: 'psychic_prediction' });
    expect(badObs.status).toBe(400);

    expect((await asUser(session).patch(`/appointments/fittings/${id}/status`).send({ status: 'READY' })).body.status).toBe('READY');
    expect((await asUser(session).patch(`/appointments/fittings/${id}/status`).send({ status: 'COMPLETED' })).body.status).toBe('COMPLETED');

    const observations = await asUser(session).get(`/appointments/fittings/${id}/observations`);
    expect(observations.body.length).toBe(1);
  });

  it('appointments and fittings are tenant-isolated', async () => {
    const a = await registerUser('p7-appt3-a-' + Date.now() + '@test.local');
    const b = await registerUser('p7-appt3-b-' + Date.now() + '@test.local');
    const customerA = await makeCustomer(a, 'Isolation A');
    const appt = await asUser(a).post('/appointments').send({ customerId: customerA.id, appointmentType: 'PICKUP', startAt, endAt });
    expect(appt.status).toBe(201);

    // B cannot create for A's customer, read A's appointment, or mutate it.
    expect((await asUser(b).post('/appointments').send({ customerId: customerA.id, startAt, endAt })).status).toBe(404);
    expect((await asUser(b).get(`/appointments/${appt.body.id}`)).status).toBe(404);
    expect((await asUser(b).patch(`/appointments/${appt.body.id}`).send({ status: 'CANCELLED' })).status).toBe(404);
    const bList = await asUser(b).get('/appointments');
    expect(bList.body.length).toBe(0);

    const fitting = await asUser(a).post('/appointments/fittings').send({ customerId: customerA.id });
    expect((await asUser(b).patch(`/appointments/fittings/${fitting.body.id}/status`).send({ status: 'IN_FITTING' })).status).toBe(404);
  });

  it('unauthenticated access to Phase 7 domains is rejected', async () => {
    for (const path of ['/crm/segments', '/referrals', '/appointments', '/appointments/fittings']) {
      expect((await request(app).get(path)).status).toBe(401);
    }
  });
});
