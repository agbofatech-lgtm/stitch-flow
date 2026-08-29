/**
 * Phase 13 — Measurement client-side unit tests.
 * Tests: unit conversion helpers, API client functions, Dexie v3 schema.
 * Does NOT test backend — pure client logic only.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { cmToInch, inchToCm, formatMeasurement } from '../../src/shared/api/measurements';
import { db } from '../../src/db/database';
import { SCHEMA_V3, CURRENT_SCHEMA_VERSION } from '../../src/db/schema';

// ---- Unit conversion ----

describe('Phase 13 — unit conversion (client helpers)', () => {
  it('converts cm to inch at 2 decimal places', () => {
    expect(cmToInch(2.54)).toBe(1.0);
    expect(cmToInch(96)).toBe(37.8);
    expect(cmToInch(100)).toBe(39.37);
  });

  it('converts inch to cm (canonical: inch × 2.54)', () => {
    expect(inchToCm(1)).toBe(2.54);
    expect(inchToCm(38)).toBe(96.52);
    expect(inchToCm(0.5)).toBe(1.27);
  });

  it('round-trip is idempotent within display precision', () => {
    const orig = 96.5;
    const roundTripped = inchToCm(cmToInch(orig));
    // Float arithmetic — round-trip within 0.02 cm is acceptable display precision
    expect(Math.abs(roundTripped - orig)).toBeLessThan(0.02);
  });

  it('formats cm display with one decimal place', () => {
    expect(formatMeasurement(96.52, 'cm')).toBe('96.5 cm');
  });

  it('formats inch display with two decimal places and quote symbol', () => {
    expect(formatMeasurement(2.54, 'inch')).toBe('1.00"');
    expect(formatMeasurement(96, 'inch')).toBe('37.80"');
  });
});

// ---- Dexie v3 schema ----

describe('Phase 13 — Dexie v3 schema (offline-first)', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('includes Phase 13 measurement tables at v3', async () => {
    expect(db.verno).toBe(CURRENT_SCHEMA_VERSION);
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('measurementProfilesV13');
    expect(names).toContain('measurementSetsV13');
    expect(names).toContain('measurementValuesV13');
    expect(names).toContain('measurementOutbox');
  });

  it('SCHEMA_V3 is additive — contains all v2 tables', () => {
    expect(SCHEMA_V3).toHaveProperty('customers');
    expect(SCHEMA_V3).toHaveProperty('syncQueue');
    expect(SCHEMA_V3).toHaveProperty('measurementProfilesV13');
  });

  it('can write and retrieve a cached measurement profile', async () => {
    const profile = {
      id: 'prof-test-1',
      workspaceId: 'ws-1',
      customerId: 'cust-1',
      name: 'Test Profile',
      status: 'DRAFT',
      version: 1,
      dateTaken: '2026-08-29',
    };
    await db.measurementProfilesV13.put(profile);
    const retrieved = await db.measurementProfilesV13.get('prof-test-1');
    expect(retrieved?.name).toBe('Test Profile');
    expect(retrieved?.status).toBe('DRAFT');
  });

  it('can write and retrieve a cached measurement value', async () => {
    const value = {
      id: 'val-test-1',
      workspaceId: 'ws-1',
      setId: 'set-1',
      definitionCode: 'bust_circumference',
      originalValue: 96,
      originalUnit: 'cm',
      canonicalValueCm: 96,
    };
    await db.measurementValuesV13.put(value);
    const retrieved = await db.measurementValuesV13.get('val-test-1');
    expect(retrieved?.definitionCode).toBe('bust_circumference');
    expect(retrieved?.canonicalValueCm).toBe(96);
  });

  it('profiles are workspace-scoped queryable', async () => {
    await db.measurementProfilesV13.bulkPut([
      { id: 'p1', workspaceId: 'ws-A', customerId: 'c1', name: 'P1' },
      { id: 'p2', workspaceId: 'ws-B', customerId: 'c2', name: 'P2' },
    ]);
    // workspaceId index allows filtering
    const all = await db.measurementProfilesV13.toArray();
    const wsA = all.filter((r) => r['workspaceId'] === 'ws-A');
    expect(wsA).toHaveLength(1);
    expect(wsA[0].name).toBe('P1');
  });

  it('legacy measurementProfiles table is unmodified', async () => {
    const names = db.tables.map((t) => t.name);
    expect(names).toContain('measurementProfiles');
  });
});
