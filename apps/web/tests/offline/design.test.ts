/**
 * Phase 14 — Design Intelligence client-side unit tests.
 * Tests: unit conversion, Dexie v4 schema, API client helpers.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  widthToCm, widthFromCm, lengthToCm,
  FABRIC_TYPE_LABELS, GARMENT_CATEGORY_LABELS,
  SILHOUETTE_OPTIONS, SLEEVE_OPTIONS,
} from '../../src/shared/api/design';
import { db } from '../../src/db/database';
import { SCHEMA_V4, CURRENT_SCHEMA_VERSION } from '../../src/db/schema';

// ---------------------------------------------------------------------------
// Unit conversion
// ---------------------------------------------------------------------------

describe('Phase 14 — fabric unit conversion (client helpers)', () => {
  it('converts inch to cm for fabric width', () => {
    expect(widthToCm(45, 'inch')).toBe(114.3);
    expect(widthToCm(60, 'inch')).toBe(152.4);
    expect(widthToCm(114, 'cm')).toBe(114);
  });

  it('converts cm to inch for fabric width display', () => {
    expect(widthFromCm(114.3, 'inch')).toBe(45);
    expect(widthFromCm(114, 'cm')).toBe(114);
  });

  it('converts yarn/meter/cm for fabric length', () => {
    expect(lengthToCm(1, 'yard')).toBe(91.44);
    expect(lengthToCm(6, 'yard')).toBeCloseTo(548.64, 1);
    expect(lengthToCm(3, 'meter')).toBe(300);
    expect(lengthToCm(500, 'cm')).toBe(500);
  });

  it('width round-trip is stable (inch ↔ cm)', () => {
    const original = 45;
    const cm = widthToCm(original, 'inch');
    const back = widthFromCm(cm, 'inch');
    expect(Math.abs(back - original)).toBeLessThan(0.1);
  });
});

// ---------------------------------------------------------------------------
// Option registries
// ---------------------------------------------------------------------------

describe('Phase 14 — option registries (open, extensible)', () => {
  it('fabric types cover Ghanaian market staples', () => {
    expect(FABRIC_TYPE_LABELS).toHaveProperty('ankara');
    expect(FABRIC_TYPE_LABELS).toHaveProperty('kente');
    expect(FABRIC_TYPE_LABELS).toHaveProperty('lace');
    expect(FABRIC_TYPE_LABELS).toHaveProperty('custom');
  });

  it('garment categories cover African formal wear', () => {
    expect(GARMENT_CATEGORY_LABELS).toHaveProperty('kaftan');
    expect(GARMENT_CATEGORY_LABELS).toHaveProperty('agbada');
    expect(GARMENT_CATEGORY_LABELS).toHaveProperty('gown');
  });

  it('silhouette options include flowing and a-line', () => {
    expect(SILHOUETTE_OPTIONS).toContain('flowing');
    expect(SILHOUETTE_OPTIONS).toContain('a-line');
    expect(SILHOUETTE_OPTIONS).toContain('custom');
  });

  it('sleeve options include wide and bishop', () => {
    expect(SLEEVE_OPTIONS).toContain('wide');
    expect(SLEEVE_OPTIONS).toContain('bishop');
    expect(SLEEVE_OPTIONS).toContain('sleeveless');
  });
});

// ---------------------------------------------------------------------------
// Dexie v4 schema
// ---------------------------------------------------------------------------

describe('Phase 14 — Dexie v4 schema (offline-first)', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('database is at current schema version (v5 after Phase 15)', () => {
    expect(db.verno).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBe(5);
  });

  it('Phase 14 tables are present', () => {
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('inspirationsV14');
    expect(names).toContain('fabricProfilesV14');
    expect(names).toContain('designSpecsV14');
    expect(names).toContain('localAssetsV14');
    expect(names).toContain('designOutbox');
  });

  it('SCHEMA_V4 is additive — contains all v3 and v2 tables', () => {
    expect(SCHEMA_V4).toHaveProperty('customers');
    expect(SCHEMA_V4).toHaveProperty('measurementProfilesV13');
    expect(SCHEMA_V4).toHaveProperty('inspirationsV14');
    expect(SCHEMA_V4).toHaveProperty('localAssetsV14');
  });

  it('can write and retrieve a cached inspiration', async () => {
    const insp = {
      id: 'insp-test-1',
      workspaceId: 'ws-1',
      customerId: 'cust-1',
      sourceType: 'image_upload',
      title: 'Style Reference',
      observations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.inspirationsV14.put(insp);
    const retrieved = await db.inspirationsV14.get('insp-test-1');
    expect(retrieved?.['title']).toBe('Style Reference');
    expect(retrieved?.['sourceType']).toBe('image_upload');
  });

  it('can write and retrieve a cached fabric profile', async () => {
    const fab = {
      id: 'fab-test-1',
      workspaceId: 'ws-1',
      name: 'Gold Ankara',
      fabricType: 'ankara',
      width: { value: 45, unit: 'inch' },
      availableLength: { value: 6, unit: 'yard' },
      properties: { directional: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.fabricProfilesV14.put(fab);
    const retrieved = await db.fabricProfilesV14.get('fab-test-1');
    expect(retrieved?.['name']).toBe('Gold Ankara');
    expect(retrieved?.['fabricType']).toBe('ankara');
  });

  it('can write and retrieve a cached design specification', async () => {
    const spec = {
      id: 'ds-test-1',
      workspaceId: 'ws-1',
      customerId: 'cust-1',
      name: 'Wedding Kaftan',
      version: 1,
      garment: { category: 'kaftan', silhouette: 'flowing' },
      components: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.designSpecsV14.put(spec);
    const retrieved = await db.designSpecsV14.get('ds-test-1');
    expect(retrieved?.['name']).toBe('Wedding Kaftan');
    expect(retrieved?.['status']).toBe('draft');
  });

  it('can store a blob in localAssetsV14 (binary, not localStorage)', async () => {
    const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
    const asset = {
      id: 'asset-test-1',
      workspaceId: 'ws-1',
      blob,
      mimeType: 'image/jpeg',
      filename: 'style-photo.jpg',
      createdAt: new Date().toISOString(),
    };
    await db.localAssetsV14.put(asset);
    const retrieved = await db.localAssetsV14.get('asset-test-1');
    expect(retrieved?.filename).toBe('style-photo.jpg');
    expect(retrieved?.mimeType).toBe('image/jpeg');
    expect(retrieved?.blob).toBeInstanceOf(Blob);
  });

  it('Phase 13 measurement tables are preserved at v4', () => {
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('measurementProfilesV13');
    expect(names).toContain('measurementSetsV13');
    expect(names).toContain('measurementValuesV13');
  });
});
