/**
 * Phase 13 — Measurement Profile domain service.
 * Server-authoritative, workspace-isolated, append-oriented versioning.
 * Historical validated values are never overwritten.
 */
import { randomUUID } from 'node:crypto';
import { pool } from '../../config/db';
import { ApiError } from '../../utils/apiError';
import type {
  MeasurementProfile,
  MeasurementSet,
  MeasurementValue,
  ProfileComparison,
  ValidationResult,
} from './types';
import { DEFINITION_BY_CODE } from './definitions';
import { toCanonicalCm } from './units';
import {
  assembleValidation,
  historicalSuggestions,
  runCompleteness,
  runHistoricalChecks,
  runRelationalChecks,
  validateLevel1,
  type ValueInput,
} from './validationService';

/**
 * Canonical measurement-profile identifier contract (Phase 13).
 *
 * Every profile id is issued below as `mp-<uuid>` (createProfile and
 * newProfileVersion are the ONLY issuance sites). Downstream consumers —
 * including the Phase 17 AI routes — must validate against THIS shape, never
 * a bare UUID: the id is an opaque domain string owned by this module.
 */
export const MEASUREMENT_PROFILE_ID_REGEX =
  /^mp-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProfileFull {
  profile: MeasurementProfile;
  sets: (MeasurementSet & { values: MeasurementValue[] })[];
}

export interface SetValueInput extends ValueInput {
  id?: string;
}
export interface SetInput {
  id?: string;
  category: 'body' | 'garment' | 'pattern_reserved';
  garmentType?: string | null;
  values: SetValueInput[];
}
export interface DraftUpdate {
  name?: string;
  dateTaken?: string;
  notes?: string;
  observations?: { code: string; value: string }[];
  sets?: SetInput[];
}

const rowToProfile = (r: Record<string, unknown>): MeasurementProfile => ({
  id: r.id as string,
  customerId: r.customer_id as string,
  workspaceId: r.workspace_id as string,
  name: r.name as string,
  dateTaken: String(r.date_taken).slice(0, 10),
  version: Number(r.version),
  parentProfileId: (r.parent_profile_id as string) ?? null,
  supersedesProfileId: (r.supersedes_profile_id as string) ?? null,
  status: r.status as MeasurementProfile['status'],
  notes: (r.notes as string) ?? '',
  observations: (r.qualitative_observations as MeasurementProfile['observations']) ?? [],
  createdBy: (r.created_by as string) ?? null,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

const rowToSet = (r: Record<string, unknown>): MeasurementSet => ({
  id: r.id as string,
  profileId: r.profile_id as string,
  workspaceId: r.workspace_id as string,
  category: r.category as MeasurementSet['category'],
  garmentType: (r.garment_type as string) ?? null,
  name: (r.name as string) ?? '',
  status: r.status as MeasurementSet['status'],
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

const rowToValue = (r: Record<string, unknown>): MeasurementValue => ({
  id: r.id as string,
  measurementSetId: r.measurement_set_id as string,
  workspaceId: r.workspace_id as string,
  definitionId: r.definition_id as string,
  definitionCode: r.code as string,
  canonicalValueCm: Number(r.canonical_value_cm),
  originalValue: Number(r.original_value),
  originalUnit: r.original_unit as MeasurementValue['originalUnit'],
  source: r.source as MeasurementValue['source'],
  confidence: r.confidence as MeasurementValue['confidence'],
  notes: (r.notes as string) ?? '',
  overrideReason: (r.override_reason as string) ?? null,
  overriddenBy: (r.overridden_by as string) ?? null,
  overriddenAt: r.overridden_at ? String(r.overridden_at) : null,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

async function assertCustomer(workspaceId: string, customerId: string) {
  const res = await pool.query(
    'SELECT id FROM customers WHERE id = $1 AND workspace_id = $2',
    [customerId, workspaceId],
  );
  if (res.rows.length === 0) {
    throw new ApiError(404, 'NOT_FOUND', 'Customer not found in this workspace');
  }
}

async function loadProfileRow(workspaceId: string, profileId: string) {
  const res = await pool.query(
    'SELECT * FROM measurement_profiles WHERE id = $1 AND workspace_id = $2',
    [profileId, workspaceId],
  );
  if (res.rows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Measurement profile not found');
  return res.rows[0];
}

export async function getProfileFull(workspaceId: string, profileId: string): Promise<ProfileFull> {
  const profile = rowToProfile(await loadProfileRow(workspaceId, profileId));
  const sets = await pool.query(
    'SELECT * FROM measurement_sets WHERE profile_id = $1 AND workspace_id = $2 ORDER BY category, garment_type',
    [profileId, workspaceId],
  );
  const values = await pool.query(
    `SELECT v.*, d.code
       FROM measurement_values v
       JOIN measurement_definitions d ON d.id = v.definition_id
      WHERE v.workspace_id = $1 AND v.measurement_set_id IN (
        SELECT id FROM measurement_sets WHERE profile_id = $2)
      ORDER BY d.display_order`,
    [workspaceId, profileId],
  );
  const bySet = new Map<string, MeasurementValue[]>();
  for (const row of values.rows) {
    const list = bySet.get(row.measurement_set_id) ?? [];
    list.push(rowToValue(row));
    bySet.set(row.measurement_set_id, list);
  }
  return {
    profile,
    sets: sets.rows.map((s) => ({ ...rowToSet(s), values: bySet.get(s.id) ?? [] })),
  };
}

export async function listProfiles(workspaceId: string, customerId: string) {
  await assertCustomer(workspaceId, customerId);
  const res = await pool.query(
    `SELECT * FROM measurement_profiles
      WHERE workspace_id = $1 AND customer_id = $2
      ORDER BY created_at DESC, version DESC`,
    [workspaceId, customerId],
  );
  return res.rows.map(rowToProfile);
}

export async function createProfile(
  workspaceId: string,
  customerId: string,
  userId: string,
  body: { name?: string; dateTaken?: string; notes?: string },
) {
  await assertCustomer(workspaceId, customerId);
  const versionRes = await pool.query(
    'SELECT COALESCE(MAX(version), 0) + 1 AS v FROM measurement_profiles WHERE customer_id = $1',
    [customerId],
  );
  const id = `mp-${randomUUID()}`;
  const res = await pool.query(
    `INSERT INTO measurement_profiles
       (id, customer_id, workspace_id, name, date_taken, version, status, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'DRAFT',$7,$8)
     RETURNING *`,
    [
      id,
      customerId,
      workspaceId,
      body.name?.trim() || 'New measurement profile',
      body.dateTaken || new Date().toISOString().slice(0, 10),
      versionRes.rows[0].v,
      body.notes ?? '',
      userId,
    ],
  );
  return rowToProfile(res.rows[0]);
}

/** Historical context for L3 checks + suggestions. */
async function historicalContext(workspaceId: string, customerId: string, excludeProfileId: string) {
  const profiles = await pool.query(
    `SELECT id FROM measurement_profiles
      WHERE workspace_id = $1 AND customer_id = $2 AND id <> $3 AND status <> 'DRAFT'
      ORDER BY created_at DESC`,
    [workspaceId, customerId, excludeProfileId],
  );
  const previousByCode = new Map<string, number>();
  const allByCode = new Map<string, number[]>();
  const previousVerified = new Map<string, { canonicalValueCm: number; confidence: string }>();
  for (let i = 0; i < profiles.rows.length; i++) {
    const vals = await pool.query(
      `SELECT v.canonical_value_cm, v.confidence, d.code
         FROM measurement_values v
         JOIN measurement_definitions d ON d.id = v.definition_id
        WHERE v.measurement_set_id IN (SELECT id FROM measurement_sets WHERE profile_id = $1)`,
      [profiles.rows[i].id],
    );
    for (const row of vals.rows) {
      const cm = Number(row.canonical_value_cm);
      const arr = allByCode.get(row.code) ?? [];
      arr.push(cm);
      allByCode.set(row.code, arr);
      if (i === 0) {
        previousByCode.set(row.code, cm);
        previousVerified.set(row.code, { canonicalValueCm: cm, confidence: row.confidence });
      }
    }
  }
  const averageByCode = new Map<string, number>();
  for (const [code, arr] of allByCode) {
    averageByCode.set(code, arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  return { previousByCode, averageByCode, previousVerified };
}

export type ValidationWithSuggestions = ValidationResult & {
  suggestions: { definitionCode: string; label: string; previousCm: number }[];
};

export async function computeValidation(full: ProfileFull): Promise<ValidationWithSuggestions> {
  const allInputs: ValueInput[] = [];
  for (const set of full.sets) {
    for (const v of set.values) {
      allInputs.push({ definitionCode: v.definitionCode, originalValue: v.originalValue, originalUnit: v.originalUnit, source: v.source });
    }
  }
  const level1 = validateLevel1(allInputs);
  const allValues = full.sets.flatMap((s) => s.values);
  const relational = runRelationalChecks(allValues);
  const ctx = await historicalContext(full.profile.workspaceId, full.profile.customerId, full.profile.id);
  const anomalies = runHistoricalChecks(allValues, ctx.previousByCode, ctx.averageByCode);
  const completeness = [
    runCompleteness(new Set((full.sets.find((s) => s.category === 'body')?.values ?? []).map((v) => v.definitionCode)), 'body'),
    ...full.sets
      .filter((s) => s.category === 'garment' && s.garmentType)
      .map((s) => runCompleteness(new Set(s.values.map((v) => v.definitionCode)), s.garmentType as string)),
  ];
  const result = assembleValidation({ level1Errors: level1, relational, anomalies, completeness });
  const bodyMissing = result.completeness.find((c) => c.garmentType === 'body')?.missingDefinitions ?? [];
  return { ...result, suggestions: historicalSuggestions(bodyMissing, ctx.previousVerified) };
}

export async function updateDraft(
  workspaceId: string,
  profileId: string,
  userId: string,
  update: DraftUpdate,
): Promise<{ full: ProfileFull; validation: ValidationResult }> {
  const profileRow = await loadProfileRow(workspaceId, profileId);
  if (profileRow.status !== 'DRAFT') {
    throw new ApiError(409, 'CONFLICT', 'Only DRAFT profiles may be edited — create a new version instead');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (update.name !== undefined || update.dateTaken !== undefined || update.notes !== undefined || update.observations !== undefined) {
      await client.query(
        `UPDATE measurement_profiles
            SET name = COALESCE($3, name),
                date_taken = COALESCE($4, date_taken),
                notes = COALESCE($5, notes),
                qualitative_observations = COALESCE($6, qualitative_observations),
                updated_at = NOW()
          WHERE id = $1 AND workspace_id = $2`,
        [profileId, workspaceId, update.name ?? null, update.dateTaken ?? null, update.notes ?? null,
         update.observations ? JSON.stringify(update.observations) : null],
      );
    }
    for (const set of update.sets ?? []) {
      if (set.category === 'pattern_reserved') {
        throw new ApiError(400, 'BAD_REQUEST', 'Pattern measurement sets are reserved for future Pattern Intelligence');
      }
      const level1 = validateLevel1(set.values);
      if (level1.length > 0) throw new ApiError(400, 'VALIDATION_ERROR', level1.join('; '));
      let setId = set.id;
      if (setId) {
        const existing = await client.query(
          'SELECT id FROM measurement_sets WHERE id = $1 AND profile_id = $2 AND workspace_id = $3',
          [setId, profileId, workspaceId],
        );
        if (existing.rows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Measurement set not found');
      } else {
        // Upsert semantics: reuse the existing set for this scope if present.
        const existing = await client.query(
          `SELECT id FROM measurement_sets
            WHERE profile_id = $1 AND category = $2 AND COALESCE(garment_type,'') = $3`,
          [profileId, set.category, set.garmentType ?? ''],
        );
        if (existing.rows.length > 0) {
          setId = existing.rows[0].id;
        } else {
          setId = `ms-${randomUUID()}`;
          await client.query(
            `INSERT INTO measurement_sets (id, profile_id, workspace_id, category, garment_type, name)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [setId, profileId, workspaceId, set.category, set.garmentType ?? null,
             set.category === 'body' ? 'Body measurements' : `${set.garmentType} measurements`],
          );
        }
      }
      for (const v of set.values) {
        const def = DEFINITION_BY_CODE.get(v.definitionCode);
        if (!def) throw new ApiError(400, 'BAD_REQUEST', `Unknown definition ${v.definitionCode}`);
        const num = Number(v.originalValue);
        const unit = v.originalUnit as 'cm' | 'inch';
        const canonical = toCanonicalCm(num, unit);
        const source = (v.source as MeasurementValue['source']) ?? 'manual';
        const confidence =
          (v.confidence as MeasurementValue['confidence']) ??
          (source === 'manual' ? 'verified' : source === 'estimated' ? 'estimated' : 'unverified');
        await client.query(
          `INSERT INTO measurement_values
             (id, measurement_set_id, workspace_id, definition_id, canonical_value_cm,
              original_value, original_unit, source, confidence, notes,
              override_reason, overridden_by, overridden_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (measurement_set_id, definition_id) DO UPDATE SET
             canonical_value_cm = EXCLUDED.canonical_value_cm,
             original_value = EXCLUDED.original_value,
             original_unit = EXCLUDED.original_unit,
             source = EXCLUDED.source,
             confidence = EXCLUDED.confidence,
             notes = EXCLUDED.notes,
             override_reason = EXCLUDED.override_reason,
             overridden_by = EXCLUDED.overridden_by,
             overridden_at = EXCLUDED.overridden_at,
             updated_at = NOW()`,
          [
            `mv-${randomUUID()}`, setId, workspaceId, def.id, canonical, num, unit, source, confidence,
            v.notes ?? '', v.overrideReason ?? null, v.overrideReason ? userId : null,
            v.overrideReason ? new Date().toISOString() : null,
          ],
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  const full = await getProfileFull(workspaceId, profileId);
  const validation = await computeValidation(full);
  return { full, validation };
}

export async function validateProfile(workspaceId: string, profileId: string) {
  const full = await getProfileFull(workspaceId, profileId);
  if (full.profile.status !== 'DRAFT') throw new ApiError(409, 'CONFLICT', 'Only DRAFT profiles can be validated');
  const validation = await computeValidation(full);
  if (!validation.canValidate) {
    throw new ApiError(422, 'UNPROCESSABLE', validation.level1.errors.length ? validation.level1.errors.join('; ') : 'Profile is incomplete — required measurements are missing');
  }
  const res = await pool.query(
    `UPDATE measurement_profiles SET status = 'VALIDATED', updated_at = NOW()
      WHERE id = $1 AND workspace_id = $2 RETURNING *`,
    [profileId, workspaceId],
  );
  return { profile: rowToProfile(res.rows[0]), validation };
}

export async function activateProfile(workspaceId: string, profileId: string) {
  const row = await loadProfileRow(workspaceId, profileId);
  if (row.status !== 'VALIDATED') throw new ApiError(409, 'CONFLICT', 'Only VALIDATED profiles can be activated');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE measurement_profiles SET status = 'SUPERSEDED', updated_at = NOW()
        WHERE customer_id = $1 AND workspace_id = $2 AND status = 'ACTIVE' AND id <> $3`,
      [row.customer_id, workspaceId, profileId],
    );
    const res = await client.query(
      `UPDATE measurement_profiles SET status = 'ACTIVE', updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2 RETURNING *`,
      [profileId, workspaceId],
    );
    await client.query('COMMIT');
    return rowToProfile(res.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function archiveProfile(workspaceId: string, profileId: string) {
  const res = await pool.query(
    `UPDATE measurement_profiles SET status = 'ARCHIVED', updated_at = NOW()
      WHERE id = $1 AND workspace_id = $2 AND status IN ('DRAFT','VALIDATED','SUPERSEDED') RETURNING *`,
    [profileId, workspaceId],
  );
  if (res.rows.length === 0) throw new ApiError(409, 'CONFLICT', 'Profile cannot be archived from its current status');
  return rowToProfile(res.rows[0]);
}

export async function createNewVersion(workspaceId: string, sourceProfileId: string, userId: string) {
  const source = await getProfileFull(workspaceId, sourceProfileId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const versionRes = await client.query(
      'SELECT COALESCE(MAX(version), 0) + 1 AS v FROM measurement_profiles WHERE customer_id = $1',
      [source.profile.customerId],
    );
    const newId = `mp-${randomUUID()}`;
    await client.query(
      `INSERT INTO measurement_profiles
         (id, customer_id, workspace_id, name, date_taken, version, parent_profile_id,
          supersedes_profile_id, status, notes, qualitative_observations, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'DRAFT',$9,$10,$11)`,
      [newId, source.profile.customerId, workspaceId, source.profile.name,
       new Date().toISOString().slice(0, 10), versionRes.rows[0].v, sourceProfileId,
       sourceProfileId, source.profile.notes, JSON.stringify(source.profile.observations), userId],
    );
    for (const set of source.sets) {
      const newSetId = `ms-${randomUUID()}`;
      await client.query(
        `INSERT INTO measurement_sets (id, profile_id, workspace_id, category, garment_type, name)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [newSetId, newId, workspaceId, set.category, set.garmentType, set.name],
      );
      for (const v of set.values) {
        await client.query(
          `INSERT INTO measurement_values
             (id, measurement_set_id, workspace_id, definition_id, canonical_value_cm,
              original_value, original_unit, source, confidence, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'historical_copy','unverified',$8)`,
          [`mv-${randomUUID()}`, newSetId, workspaceId, v.definitionId, v.canonicalValueCm,
           v.originalValue, v.originalUnit, v.notes],
        );
      }
    }
    await client.query('COMMIT');
    return getProfileFull(workspaceId, newId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function compareProfiles(workspaceId: string, currentId: string, previousId: string): Promise<ProfileComparison> {
  const current = await getProfileFull(workspaceId, currentId);
  const previous = await getProfileFull(workspaceId, previousId);
  const cur = new Map(current.sets.flatMap((s) => s.values).map((v) => [v.definitionCode, v]));
  const prev = new Map(previous.sets.flatMap((s) => s.values).map((v) => [v.definitionCode, v]));
  const codes = [...new Set([...cur.keys(), ...prev.keys()])];
  const rows = codes.map((code) => {
    const c = cur.get(code)?.canonicalValueCm ?? null;
    const p = prev.get(code)?.canonicalValueCm ?? null;
    const abs = c !== null && p !== null ? Number((c - p).toFixed(2)) : null;
    const pct = c !== null && p !== null && p !== 0 ? Number((((c - p) / p) * 100).toFixed(2)) : null;
    const flag: ProfileComparison['rows'][number]['flag'] =
      pct === null ? 'NORMAL' : Math.abs(pct) > 10 ? 'FLAGGED' : Math.abs(pct) > 5 ? 'UNUSUAL' : 'NORMAL';
    return {
      definitionCode: code,
      label: DEFINITION_BY_CODE.get(code)?.label ?? code,
      currentCm: c,
      previousCm: p,
      absoluteDifferenceCm: abs,
      percentChange: pct,
      flag,
    };
  });
  return { currentProfileId: currentId, previousProfileId: previousId, rows };
}
