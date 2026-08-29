/**
 * Phase 14 — Design Intelligence backend certification.
 * Tests: domain contracts, readiness engine, fabric unit conversions,
 * API CRUD for inspirations/fabrics/design-specs, traceability, auth isolation.
 */
import request from 'supertest';
import { app } from '../src/app';
import { registerUser, type AuthSession } from './helpers';
import { computeReadiness } from '../src/modules/design/readinessEngine';
import type { DesignSpecification } from '../src/modules/design/types';
import { computeDesignSuggestions } from '../src/modules/design/measurementAdapter';
import type { DesignMeasurementContext } from '../src/modules/design/types';

async function createCustomer(session: AuthSession, name: string): Promise<string> {
  const res = await request(app)
    .post('/customers')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .send({ fullName: name, phone: '+233200000001', email: '' });
  expect(res.status).toBe(201);
  return res.body.customer?.id ?? res.body.id;
}

// ---------------------------------------------------------------------------
// Domain contract tests (pure unit — no DB)
// ---------------------------------------------------------------------------

describe('Phase 14 — readiness engine (pure unit)', () => {
  const baseSpec: Omit<DesignSpecification, 'readiness'> = {
    id: 'ds-1', workspaceId: 'ws-1', customerId: null, name: 'Test',
    version: 1, parentSpecificationId: null,
    garment: { category: 'kaftan', subtype: null, silhouette: 'flowing', fit: 'loose', lengthType: 'ankle', targetLengthCm: 142 },
    sleeves: { type: 'wide', targetLengthCm: null },
    neckline: { type: 'round' },
    components: [{ type: 'front_panel' }, { type: 'back_panel' }],
    constructionDetails: ['darts'],
    easeConfigurations: [],
    observations: [{ category: 'silhouette', value: 'flowing', confidence: 'manual' }],
    measurementProfileId: 'mp-1',
    measurementContext: null,
    inspirationIds: ['insp-1'],
    fabricProfileIds: ['fab-1'],
    notes: '',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('draft status when garment category missing', () => {
    const r = computeReadiness(
      { ...baseSpec, garment: { ...baseSpec.garment, category: '' } },
      { hasMeasurementProfile: false, hasInspirations: false, hasFabricProfiles: false, fabricHasWidth: false },
    );
    expect(r.status).toBe('draft');
  });

  it('partial status when measurement profile missing', () => {
    const r = computeReadiness(
      baseSpec,
      { hasMeasurementProfile: false, hasInspirations: true, hasFabricProfiles: true, fabricHasWidth: true },
    );
    expect(r.status).toBe('partial');
  });

  it('ready_for_design when all critical items satisfied', () => {
    const r = computeReadiness(
      baseSpec,
      {
        hasMeasurementProfile: true,
        measurementProfileStatus: 'VALIDATED',
        hasInspirations: true,
        hasFabricProfiles: true,
        fabricHasWidth: true,
      },
    );
    expect(r.status).toBe('ready_for_design');
    expect(r.canOpenDesignStudio).toBe(true);
  });

  it('canOpenDesignStudio is false for draft status', () => {
    const r = computeReadiness(
      { ...baseSpec, garment: { ...baseSpec.garment, category: '' } },
      { hasMeasurementProfile: false, hasInspirations: false, hasFabricProfiles: false, fabricHasWidth: false },
    );
    expect(r.canOpenDesignStudio).toBe(false);
  });

  it('warning shown when measurement is DRAFT status', () => {
    const r = computeReadiness(
      baseSpec,
      { hasMeasurementProfile: true, measurementProfileStatus: 'DRAFT', hasInspirations: true, hasFabricProfiles: false, fabricHasWidth: false },
    );
    const measItem = r.items.find((i) => i.key === 'measurement_validated');
    expect(measItem?.warning).toBeTruthy();
  });
});

describe('Phase 14 — design suggestions (pure unit)', () => {
  const ctx: DesignMeasurementContext = {
    profileId: 'mp-1',
    profileVersion: 1,
    canonicalUnit: 'cm',
    body: {
      bust_circumference: 96,
      waist_circumference: 80,
      hip_circumference: 102,
    },
    validation: { status: 'VALIDATED', warnings: [] },
  };

  it('produces suggestions for known body measurement codes', () => {
    const suggestions = computeDesignSuggestions(ctx, 'regular');
    expect(suggestions.length).toBeGreaterThan(0);
    const bust = suggestions.find((s) => s.area === 'bust_circumference');
    expect(bust).toBeDefined();
    expect(bust!.bodyMeasurementCm).toBe(96);
    expect(bust!.easeCm).toBeGreaterThan(0);
    expect(bust!.suggestedFinishedCm).toBe(bust!.bodyMeasurementCm + bust!.easeCm);
  });

  it('fitted fit reduces ease compared to regular', () => {
    const regular = computeDesignSuggestions(ctx, 'regular');
    const fitted = computeDesignSuggestions(ctx, 'fitted');
    const bustRegular = regular.find((s) => s.area === 'bust_circumference')!;
    const bustFitted = fitted.find((s) => s.area === 'bust_circumference')!;
    expect(bustFitted.easeCm).toBeLessThan(bustRegular.easeCm);
  });

  it('loose fit increases ease compared to regular', () => {
    const regular = computeDesignSuggestions(ctx, 'regular');
    const loose = computeDesignSuggestions(ctx, 'loose');
    const bustRegular = regular.find((s) => s.area === 'bust_circumference')!;
    const bustLoose = loose.find((s) => s.area === 'bust_circumference')!;
    expect(bustLoose.easeCm).toBeGreaterThan(bustRegular.easeCm);
  });
});

// ---------------------------------------------------------------------------
// API integration tests
// ---------------------------------------------------------------------------

describe('Phase 14 — inspiration API', () => {
  // tests/setup.ts truncates tenant tables before every test — seed per test.
  async function seed() {
    const session = await registerUser('phase14-inspiration@example.com');
    const customerId = await createCustomer(session, 'Inspiration Test Customer');
    return { session, customerId };
  }

  it('rejects unauthenticated access (401)', async () => {
    const { customerId } = await seed();
    const res = await request(app).get(`/customers/${customerId}/inspirations`);
    expect(res.status).toBe(401);
  });

  it('creates an inspiration with manual source type', async () => {
    const { session, customerId } = await seed();
    const res = await request(app)
      .post(`/customers/${customerId}/inspirations`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        sourceType: 'manual',
        title: 'Flowing Kaftan Reference',
        notes: 'Customer showed me a picture on phone',
        observations: [
          { category: 'garment', value: 'kaftan', confidence: 'manual' },
          { category: 'silhouette', value: 'flowing', confidence: 'manual' },
          { category: 'length', value: 'ankle', confidence: 'manual' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.inspiration.sourceType).toBe('manual');
    expect(res.body.inspiration.observations).toHaveLength(3);
    expect(res.body.inspiration.workspaceId).toBeTruthy();
  });

  it('creates a reference_url inspiration (URL is metadata only)', async () => {
    const { session, customerId } = await seed();
    const res = await request(app)
      .post(`/customers/${customerId}/inspirations`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        sourceType: 'reference_url',
        title: 'Style Reference',
        sourceUrl: 'https://example.com/style',
        observations: [],
      });
    expect(res.status).toBe(201);
    expect(res.body.inspiration.sourceUrl).toBe('https://example.com/style');
  });

  it('lists inspirations for customer', async () => {
    const { session, customerId } = await seed();
    // Seed two inspirations, then verify both are listed.
    for (const title of ['Listed One', 'Listed Two']) {
      const c = await request(app)
        .post(`/customers/${customerId}/inspirations`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ sourceType: 'manual', title, observations: [] });
      expect(c.status).toBe(201);
    }
    const res = await request(app)
      .get(`/customers/${customerId}/inspirations`)
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.inspirations)).toBe(true);
    expect(res.body.inspirations.length).toBeGreaterThanOrEqual(2);
  });

  it('updates inspiration observations', async () => {
    const { session, customerId } = await seed();
    const createRes = await request(app)
      .post(`/customers/${customerId}/inspirations`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ sourceType: 'existing_garment', title: 'Existing Shirt', observations: [] });
    const id = createRes.body.inspiration.id;

    const patchRes = await request(app)
      .patch(`/customers/${customerId}/inspirations/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ observations: [{ category: 'sleeve', value: 'long', confidence: 'confirmed' }] });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.inspiration.observations).toHaveLength(1);
  });

  it('deletes an inspiration', async () => {
    const { session, customerId } = await seed();
    const createRes = await request(app)
      .post(`/customers/${customerId}/inspirations`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ sourceType: 'screenshot', title: 'Screenshot to delete', observations: [] });
    const id = createRes.body.inspiration.id;

    const deleteRes = await request(app)
      .delete(`/customers/${customerId}/inspirations/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/customers/${customerId}/inspirations/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(getRes.status).toBe(404);
  });
});

describe('Phase 14 — fabric profile API', () => {
  // tests/setup.ts truncates tenant tables before every test — seed per test.
  async function seed() {
    const session = await registerUser('phase14-fabric@example.com');
    return { session };
  }

  it('creates a fabric profile with width in inches', async () => {
    const { session } = await seed();
    const res = await request(app)
      .post('/fabric-profiles')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: 'Gold Ankara',
        fabricType: 'ankara',
        width: { value: 45, unit: 'inch' },
        availableLength: { value: 6, unit: 'yard' },
        properties: {
          directional: true,
          patternRepeat: true,
          requiresMatching: true,
          stretch: 'none',
          transparency: 'opaque',
        },
        notes: 'Customer brought this fabric',
      });
    expect(res.status).toBe(201);
    const fp = res.body.fabricProfile;
    expect(fp.name).toBe('Gold Ankara');
    expect(fp.width.value).toBe(45);
    expect(fp.width.unit).toBe('inch');
    expect(fp.availableLength.value).toBe(6);
    expect(fp.availableLength.unit).toBe('yard');
    expect(fp.properties.directional).toBe(true);
    expect(fp.properties.requiresMatching).toBe(true);
  });

  it('creates a fabric profile with width in cm', async () => {
    const { session } = await seed();
    const res = await request(app)
      .post('/fabric-profiles')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: 'Blue Kente',
        fabricType: 'kente',
        width: { value: 114, unit: 'cm' },
        availableLength: { value: 3, unit: 'meter' },
        properties: { directional: false, stretch: 'none', transparency: 'opaque' },
      });
    expect(res.status).toBe(201);
    expect(res.body.fabricProfile.width.value).toBe(114);
    expect(res.body.fabricProfile.width.unit).toBe('cm');
  });

  it('updates fabric properties', async () => {
    const { session } = await seed();
    const createRes = await request(app)
      .post('/fabric-profiles')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ name: 'Test Fabric', fabricType: 'cotton', properties: {} });
    const id = createRes.body.fabricProfile.id;

    const patchRes = await request(app)
      .patch(`/fabric-profiles/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ properties: { stretch: 'high', transparency: 'sheer' } });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.fabricProfile.properties.stretch).toBe('high');
    expect(patchRes.body.fabricProfile.properties.transparency).toBe('sheer');
  });
});

describe('Phase 14 — design specification API', () => {
  // tests/setup.ts truncates tenant tables before every test — seed per test.
  async function seed() {
    const session = await registerUser('phase14-designspec@example.com');
    const customerId = await createCustomer(session, 'Design Spec Customer');

    const inspRes = await request(app)
      .post(`/customers/${customerId}/inspirations`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ sourceType: 'image_upload', title: 'Style Photo', observations: [] });
    const inspirationId = inspRes.body.inspiration.id;

    const fabRes = await request(app)
      .post('/fabric-profiles')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: 'Wedding Lace',
        fabricType: 'lace',
        width: { value: 60, unit: 'inch' },
        availableLength: { value: 5, unit: 'yard' },
        properties: { directional: false },
      });
    const fabricProfileId = fabRes.body.fabricProfile.id;

    return { session, customerId, inspirationId, fabricProfileId };
  }

  it('creates a design specification with garment classification', async () => {
    const { session, customerId, inspirationId, fabricProfileId } = await seed();
    const res = await request(app)
      .post(`/customers/${customerId}/design-specifications`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: 'Ama Wedding Kaftan',
        garment: { category: 'kaftan', silhouette: 'flowing', fit: 'loose', lengthType: 'ankle', targetLengthCm: 142 },
        sleeves: { type: 'wide', targetLengthCm: 60 },
        neckline: { type: 'round' },
        components: [
          { type: 'front_panel', required: true },
          { type: 'back_panel', required: true },
          { type: 'overlay' },
        ],
        constructionDetails: ['embroidery', 'lining'],
        observations: [{ category: 'silhouette', value: 'flowing', confidence: 'manual' }],
        inspirationIds: [inspirationId],
        fabricProfileIds: [fabricProfileId],
        notes: 'Wedding kaftan for Ama',
      });
    expect(res.status).toBe(201);
    const spec = res.body.designSpecification;
    expect(spec.garment.category).toBe('kaftan');
    expect(spec.garment.silhouette).toBe('flowing');
    expect(spec.components).toHaveLength(3);
    expect(spec.inspirationIds).toContain(inspirationId);
    expect(spec.fabricProfileIds).toContain(fabricProfileId);
    expect(spec.status).toBe('draft');
  });

  it('retrieves design spec with readiness report', async () => {
    const { session, customerId } = await seed();
    const createRes = await request(app)
      .post(`/customers/${customerId}/design-specifications`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: 'Readiness Test Spec',
        garment: { category: 'dress' },
        components: [],
        observations: [],
      });
    const id = createRes.body.designSpecification.id;

    const getRes = await request(app)
      .get(`/customers/${customerId}/design-specifications/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.designSpecification.readiness).toBeDefined();
    expect(getRes.body.designSpecification.readiness.items).toBeInstanceOf(Array);
    expect(typeof getRes.body.designSpecification.readiness.canOpenDesignStudio).toBe('boolean');
  });

  it('updates design specification status to ready_for_design', async () => {
    const { session, customerId, inspirationId, fabricProfileId } = await seed();
    const createRes = await request(app)
      .post(`/customers/${customerId}/design-specifications`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: 'Status Transition Test',
        garment: { category: 'shirt', silhouette: 'regular' },
        observations: [{ category: 'fit', value: 'regular', confidence: 'manual' }],
        inspirationIds: [inspirationId],
        fabricProfileIds: [fabricProfileId],
      });
    const id = createRes.body.designSpecification.id;

    const patchRes = await request(app)
      .patch(`/customers/${customerId}/design-specifications/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ status: 'ready_for_design' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.designSpecification.status).toBe('ready_for_design');
  });

  it('version history records transitions', async () => {
    const { session, customerId } = await seed();
    const createRes = await request(app)
      .post(`/customers/${customerId}/design-specifications`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ name: 'Version History Test', garment: { category: 'gown' }, observations: [] });
    const id = createRes.body.designSpecification.id;

    // Transition to validated (triggers history snapshot)
    await request(app)
      .patch(`/customers/${customerId}/design-specifications/${id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ status: 'validated' });

    const histRes = await request(app)
      .get(`/customers/${customerId}/design-specifications/${id}/history`)
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(histRes.status).toBe(200);
    expect(Array.isArray(histRes.body.history)).toBe(true);
    expect(histRes.body.history.length).toBeGreaterThan(0);
  });

  it('enforces workspace isolation — different workspace cannot access spec', async () => {
    const { session, customerId } = await seed();
    const otherSession = await registerUser('phase14-isolation@example.com');
    const otherCustomer = await createCustomer(otherSession, 'Isolation Customer');

    const createRes = await request(app)
      .post(`/customers/${customerId}/design-specifications`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ name: 'Private Spec', garment: { category: 'shirt' }, observations: [] });
    const id = createRes.body.designSpecification.id;

    // Other workspace trying to access — must get 404 (different workspace)
    const getRes = await request(app)
      .get(`/customers/${otherCustomer}/design-specifications/${id}`)
      .set('Authorization', `Bearer ${otherSession.accessToken}`);
    expect(getRes.status).toBe(404);
  });
});

describe('Phase 14 — asset registration API', () => {
  it('registers asset metadata (thumbnail only)', async () => {
    // tests/setup.ts truncates tenant tables before every test — seed in-test.
    const session = await registerUser('phase14-assets@example.com');
    const res = await request(app)
      .post('/local-assets')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        filename: 'style-photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 245000,
        widthPx: 1080,
        heightPx: 1350,
        thumbnailDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgAB',
      });
    expect(res.status).toBe(201);
    expect(res.body.asset.filename).toBe('style-photo.jpg');
    expect(res.body.asset.workspaceId).toBeTruthy();
  });
});
