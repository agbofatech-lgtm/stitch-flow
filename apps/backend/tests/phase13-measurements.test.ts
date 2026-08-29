/**
 * Phase 13 — Measurement Intelligence backend certification (§57).
 */
import request from 'supertest';
import { app } from '../src/app';
import { registerUser, type AuthSession } from './helpers';
import { toCanonicalCm, fromCanonicalCm, roundTripExact, toCanonicalScale } from '../src/modules/measurements/units';
import { ALL_DEFINITIONS, requiredDefinitionsFor, definitionsForGarment } from '../src/modules/measurements/definitions';

async function createCustomer(session: AuthSession, name: string): Promise<string> {
  const res = await request(app)
    .post('/customers')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .send({ fullName: name, phone: '+233200000000', email: '' });
  expect(res.status).toBe(201);
  return res.body.customer?.id ?? res.body.id;
}

const mpBase = (customerId: string) => `/customers/${customerId}/measurement-profiles`;

const BODY_FULL = [
  ['bust_circumference', 96], ['waist_circumference', 84], ['hip_circumference', 102],
  ['neck_circumference', 38], ['shoulder_width', 44], ['sleeve_length', 60],
  ['inseam_length', 78], ['outseam_length', 100],
];

describe('Phase 13 — units & definitions (domain)', () => {
  it('converts inch to cm deterministically at canonical scale', () => {
    expect(toCanonicalCm(38, 'inch')).toBe(96.52);
    expect(toCanonicalCm(1, 'inch')).toBe(2.54);
    expect(toCanonicalCm(100, 'cm')).toBe(100);
  });
  it('preserves original value semantics and round-trips without drift', () => {
    for (const [v, u] of [[38, 'inch'], [96.5, 'cm'], [12.25, 'inch']] as const) {
      const canonical = toCanonicalCm(v, u);
      expect(roundTripExact(v, u)).toBe(true);
      expect(toCanonicalScale(fromCanonicalCm(canonical, u))).toBe(toCanonicalScale(v));
    }
  });
  it('rejects invalid units and non-finite values', () => {
    expect(() => toCanonicalCm(10, 'm' as never)).toThrow();
    expect(() => toCanonicalCm(Number.NaN, 'cm')).toThrow();
  });
  it('registry covers body, garment and reserved pattern categories', () => {
    const cats = new Set(ALL_DEFINITIONS.map((d) => d.category));
    expect(cats.has('body')).toBe(true);
    expect(cats.has('garment')).toBe(true);
    expect(cats.has('pattern')).toBe(true);
    expect(requiredDefinitionsFor('body').length).toBeGreaterThanOrEqual(5);
    expect(definitionsForGarment('shirt').map((d) => d.code)).toContain('collar_circumference');
    expect(requiredDefinitionsFor('shirt').map((d) => d.code)).toContain('cuff_circumference');
  });
});

describe('Phase 13 — measurement profiles API', () => {
  // tests/setup.ts truncates tenant tables between tests — seed per test.
  async function seed() {
    const a = await registerUser('p13-owner-a@example.com');
    const b = await registerUser('p13-owner-b@example.com');
    const customerA = await createCustomer(a, 'Ama Serwaa');
    return { a, b, customerA };
  }

  it('rejects unauthenticated access (401)', async () => {
    const { a, b, customerA } = await seed();
    const res = await request(app).get(mpBase(customerA));
    expect(res.status).toBe(401);
  });

  it('creates a profile: version 1, DRAFT, workspace-associated', async () => {
    const { a, b, customerA } = await seed();
    const res = await request(app)
      .post(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: "Ama's August 2026 Measurements" });
    if (res.status !== 201) console.log('DBG403', JSON.stringify(res.body));
    expect(res.status).toBe(201);
    expect(res.body.profile.version).toBe(1);
    expect(res.body.profile.status).toBe('DRAFT');
    expect(res.body.profile.workspaceId).toBe(a.workspaceId);
    expect(res.body.profile.customerId).toBe(customerA);
  });

  it('saves body measurements with original-value preservation (38 in → 96.52 cm)', async () => {
    const { a, b, customerA } = await seed();
    const created = await request(app)
      .post(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'Unit check' });
    const pid = created.body.profile.id;
    const res = await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: [
        { definitionCode: 'bust_circumference', originalValue: 38, originalUnit: 'inch' },
      ] }] });
    expect(res.status).toBe(200);
    const v = res.body.sets.find((s: { category: string }) => s.category === 'body').values[0];
    expect(v.originalValue).toBe(38);
    expect(v.originalUnit).toBe('inch');
    expect(v.canonicalValueCm).toBe(96.52);
  });

  it('rejects invalid values, units and duplicates (L1)', async () => {
    const { a, b, customerA } = await seed();
    const created = await request(app)
      .post(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'L1' });
    const pid = created.body.profile.id;
    const bad = await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: [
        { definitionCode: 'waist_circumference', originalValue: -5, originalUnit: 'cm' },
      ] }] });
    expect(bad.status).toBe(400);
    const badUnit = await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: [
        { definitionCode: 'waist_circumference', originalValue: 5, originalUnit: 'm' },
      ] }] });
    expect(badUnit.status).toBe(400);
    const dup = await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: [
        { definitionCode: 'waist_circumference', originalValue: 5, originalUnit: 'cm' },
        { definitionCode: 'waist_circumference', originalValue: 6, originalUnit: 'cm' },
      ] }] });
    expect(dup.status).toBe(400);
  });

  it('completeness: PARTIAL then COMPLETE; relational WARNING does not block', async () => {
    const { a, b, customerA } = await seed();
    const created = await request(app)
      .post(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'Completeness' });
    const pid = created.body.profile.id;
    const partial = await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: [
        { definitionCode: 'bust_circumference', originalValue: 96, originalUnit: 'cm' },
      ] }] });
    const bodyComp = partial.body.validation.completeness.find((c: { garmentType: string }) => c.garmentType === 'body');
    expect(bodyComp.state).toBe('PARTIAL');
    expect(bodyComp.missingDefinitions).toContain('waist_circumference');

    const full = await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: [
        ...BODY_FULL.filter(([code]) => code !== 'outseam_length')
          .map(([code, v]) => ({ definitionCode: code, originalValue: v, originalUnit: 'cm' })),
        // unusual relationship: outseam < inseam → warning only
        { definitionCode: 'outseam_length', originalValue: 70, originalUnit: 'cm' },
      ] }] });
    expect(full.status).toBe(200);
    const comp = full.body.validation.completeness.find((c: { garmentType: string }) => c.garmentType === 'body');
    expect(comp.state).toBe('READY_FOR_DESIGN');
    const warn = full.body.validation.relational.find(
      (r: { code: string }) => r.code === 'inseam_length<=outseam_length',
    );
    expect(warn.result).toBe('WARNING');
    expect(full.body.validation.canSave).toBe(true);
  });

  it('garment sets are definition-driven (shirt)', async () => {
    const { a, b, customerA } = await seed();
    const defs = await request(app)
      .get('/measurement-definitions?garmentType=shirt')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(defs.status).toBe(200);
    expect(defs.body.definitions.length).toBeGreaterThanOrEqual(7);

    const created = await request(app)
      .post(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'Garment' });
    const pid = created.body.profile.id;
    const res = await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'garment', garmentType: 'shirt', values: [
        { definitionCode: 'collar_circumference', originalValue: 15, originalUnit: 'inch' },
        { definitionCode: 'cuff_circumference', originalValue: 24, originalUnit: 'cm' },
      ] }] });
    expect(res.status).toBe(200);
    const set = res.body.sets.find((s: { category: string }) => s.category === 'garment');
    expect(set.garmentType).toBe('shirt');
    expect(set.values).toHaveLength(2);
    const comp = res.body.validation.completeness.find((c: { garmentType: string }) => c.garmentType === 'shirt');
    expect(comp.state).toBe('PARTIAL');
  });

  it('versioning: new version copies values as historical_copy, lineage recorded, history immutable', async () => {
    const { a, b, customerA } = await seed();
    const created = await request(app)
      .post(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'Lineage' });
    const pid = created.body.profile.id;
    await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: BODY_FULL.map(([code, v]) => ({ definitionCode: code, originalValue: v, originalUnit: 'cm' })) }] });
    const validated = await request(app)
      .post(`${mpBase(customerA)}/${pid}/validate`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(validated.status).toBe(200);
    expect(validated.body.profile.status).toBe('VALIDATED');
    const act1 = await request(app)
      .post(`${mpBase(customerA)}/${pid}/activate`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(act1.status).toBe(200);

    // immutable history: PATCH on VALIDATED profile rejected
    const edit = await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'attempted rewrite' });
    expect(edit.status).toBe(409);

    const v2 = await request(app)
      .post(`${mpBase(customerA)}/${pid}/new-version`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(v2.status).toBe(201);
    expect(v2.body.profile.version).toBe(2);
    expect(v2.body.profile.parentProfileId).toBe(pid);
    expect(v2.body.profile.supersedesProfileId).toBe(pid);
    expect(v2.body.profile.status).toBe('DRAFT');
    const copied = v2.body.sets.find((s: { category: string }) => s.category === 'body').values[0];
    expect(copied.source).toBe('historical_copy');
    expect(copied.confidence).toBe('unverified');

    // activate v2 → v1 SUPERSEDED
    await request(app)
      .patch(`${mpBase(customerA)}/${v2.body.profile.id}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: BODY_FULL.map(([code, v]) => ({ definitionCode: code, originalValue: v, originalUnit: 'cm' })) }] });
    await request(app).post(`${mpBase(customerA)}/${v2.body.profile.id}/validate`).set('Authorization', `Bearer ${a.accessToken}`);
    const act = await request(app)
      .post(`${mpBase(customerA)}/${v2.body.profile.id}/activate`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(act.status).toBe(200);
    expect(act.body.profile.status).toBe('ACTIVE');
    const list = await request(app)
      .get(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`);
    const v1 = list.body.profiles.find((p: { id: string }) => p.id === pid);
    expect(v1.status).toBe('SUPERSEDED');
    // newest first
    expect(list.body.profiles[0].version).toBeGreaterThanOrEqual(list.body.profiles[1].version);
  });

  it('historical anomaly FLAGGED + override recorded', async () => {
    const { a, b, customerA } = await seed();
    const created = await request(app)
      .post(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'Anomaly root' });
    const pid = created.body.profile.id;
    await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: BODY_FULL.map(([code, v]) => ({ definitionCode: code, originalValue: v, originalUnit: 'cm' })) }] });
    await request(app).post(`${mpBase(customerA)}/${pid}/validate`).set('Authorization', `Bearer ${a.accessToken}`);

    const v2 = await request(app)
      .post(`${mpBase(customerA)}/${pid}/new-version`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    const v2id = v2.body.profile.id;
    const changed = await request(app)
      .patch(`${mpBase(customerA)}/${v2id}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: BODY_FULL.map(([code, v]) => ({
        definitionCode: code,
        originalValue: code === 'waist_circumference' ? 96 : v, // +14% vs 84
        originalUnit: 'cm',
        overrideReason: code === 'waist_circumference' ? 'Tape re-checked by senior tailor' : null,
      })) }] });
    const anomaly = changed.body.validation.anomalies.find(
      (x: { definitionCode: string }) => x.definitionCode === 'waist_circumference',
    );
    expect(anomaly.state).toBe('FLAGGED');
    expect(anomaly.explanation).toContain('Historical change detected');
    const waist = changed.body.sets.find((s: { category: string }) => s.category === 'body')
      .values.find((x: { definitionCode: string }) => x.definitionCode === 'waist_circumference');
    expect(waist.overrideReason).toBe('Tape re-checked by senior tailor');
    expect(waist.overriddenBy).toBeTruthy();
    expect(waist.overriddenAt).toBeTruthy();
  });

  it('comparison returns absolute + percentage differences with neutral flags', async () => {
    const { a, b, customerA } = await seed();
    const p1 = await request(app).post(mpBase(customerA)).set('Authorization', `Bearer ${a.accessToken}`).send({ name: 'cmp v1' });
    await request(app).patch(`${mpBase(customerA)}/${p1.body.profile.id}`).set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: BODY_FULL.map(([code, v]) => ({ definitionCode: code, originalValue: v, originalUnit: 'cm' })) }] });
    await request(app).post(`${mpBase(customerA)}/${p1.body.profile.id}/validate`).set('Authorization', `Bearer ${a.accessToken}`);
    const p2 = await request(app).post(`${mpBase(customerA)}/${p1.body.profile.id}/new-version`).set('Authorization', `Bearer ${a.accessToken}`);
    await request(app).patch(`${mpBase(customerA)}/${p2.body.profile.id}`).set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: BODY_FULL.map(([code, v]) => ({ definitionCode: code, originalValue: code === 'waist_circumference' ? 90 : v, originalUnit: 'cm' })) }] });
    await request(app).post(`${mpBase(customerA)}/${p2.body.profile.id}/validate`).set('Authorization', `Bearer ${a.accessToken}`);
    const list = await request(app)
      .get(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`);
    const profiles = list.body.profiles.filter((p: { status: string }) => p.status !== 'DRAFT');
    expect(profiles.length).toBeGreaterThanOrEqual(2);
    const res = await request(app)
      .get(`${mpBase(customerA)}/compare?currentId=${profiles[0].id}&previousId=${profiles[1].id}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(res.status).toBe(200);
    const row = res.body.comparison.rows.find((r: { definitionCode: string }) => r.definitionCode === 'waist_circumference');
    expect(row).toBeTruthy();
    expect(typeof row.absoluteDifferenceCm === 'number' || row.absoluteDifferenceCm === null).toBe(true);
    expect(['NORMAL', 'UNUSUAL', 'FLAGGED']).toContain(row.flag);
  });

  it('historical suggestion surfaces previous verified value, never predictions', async () => {
    const { a, b, customerA } = await seed();
    const root = await request(app).post(mpBase(customerA)).set('Authorization', `Bearer ${a.accessToken}`).send({ name: 'root' });
    await request(app).patch(`${mpBase(customerA)}/${root.body.profile.id}`).set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: BODY_FULL.map(([code, v]) => ({ definitionCode: code, originalValue: v, originalUnit: 'cm' })) }] });
    await request(app).post(`${mpBase(customerA)}/${root.body.profile.id}/validate`).set('Authorization', `Bearer ${a.accessToken}`);
    const created = await request(app)
      .post(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'Suggestion probe' });
    const pid = created.body.profile.id;
    // only bust entered → waist missing; previous verified waist exists
    await request(app)
      .patch(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: [
        { definitionCode: 'bust_circumference', originalValue: 96, originalUnit: 'cm' },
      ] }] });
    const got = await request(app)
      .get(`${mpBase(customerA)}/${pid}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    const suggestion = got.body.validation.suggestions.find(
      (s: { definitionCode: string }) => s.definitionCode === 'waist_circumference',
    );
    expect(suggestion).toBeTruthy();
    expect(suggestion.previousCm).toBe(84);
  });

  it('enforces customer and workspace isolation server-side', async () => {
    const { a, b, customerA } = await seed();
    await request(app).post(mpBase(customerA)).set('Authorization', `Bearer ${a.accessToken}`).send({ name: 'iso' });
    const list = await request(app)
      .get(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`);
    const pid = list.body.profiles[0].id;

    const otherCustomer = await createCustomer(b, 'Kofi Mensah');
    const crossCustomer = await request(app)
      .get(mpBase(otherCustomer))
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(crossCustomer.status).toBe(404); // customer B is not in workspace A

    const crossWorkspace = await request(app)
      .get(`/customers/${customerA}/measurement-profiles/${pid}`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(crossWorkspace.status).toBe(404);

    const crossList = await request(app)
      .get(mpBase(customerA))
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(crossList.status).toBe(404);
  });

  it('rejects reserved future sources in Phase 13', async () => {
    const { a, b, customerA } = await seed();
    const created = await request(app)
      .post(mpBase(customerA))
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'Reserved source' });
    const res = await request(app)
      .patch(`${mpBase(customerA)}/${created.body.profile.id}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ sets: [{ category: 'body', values: [
        { definitionCode: 'waist_circumference', originalValue: 80, originalUnit: 'cm', source: 'ai_suggested' },
      ] }] });
    expect(res.status).toBe(400);
  });
});
