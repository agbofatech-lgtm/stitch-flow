/**
 * Phase 14 — Measurement → Design Adapter.
 * Normalizes Phase 13 measurement profile data into a DesignMeasurementContext.
 * NEVER mutates original measurements.
 * NEVER allows Design Studio to query raw measurement tables directly.
 */
import { pool } from '../../config/db';
import type { DesignMeasurementContext } from './types';

/**
 * Build a DesignMeasurementContext from a Phase 13 measurement profile.
 * Returns null if the profile does not belong to the workspace.
 */
export async function buildMeasurementContext(
  workspaceId: string,
  measurementProfileId: string,
): Promise<DesignMeasurementContext | null> {
  // 1. Load the profile header
  const { rows: profileRows } = await pool.query(
    `SELECT id, workspace_id, version, status
     FROM measurement_profiles
     WHERE id = $1 AND workspace_id = $2`,
    [measurementProfileId, workspaceId],
  );
  if (profileRows.length === 0) return null;
  const profile = profileRows[0] as Record<string, unknown>;

  // 2. Load body measurements (canonical cm values)
  const { rows: bodyRows } = await pool.query(
    `SELECT d.code, mv.canonical_value_cm
     FROM measurement_values mv
     JOIN measurement_definitions d ON d.id = mv.definition_id
     JOIN measurement_sets ms ON ms.id = mv.measurement_set_id
     WHERE ms.profile_id = $1
       AND ms.category = 'body'
       AND mv.workspace_id = $2`,
    [measurementProfileId, workspaceId],
  );

  // 3. Load garment measurements (canonical cm values)
  const { rows: garmentRows } = await pool.query(
    `SELECT d.code, mv.canonical_value_cm
     FROM measurement_values mv
     JOIN measurement_definitions d ON d.id = mv.definition_id
     JOIN measurement_sets ms ON ms.id = mv.measurement_set_id
     WHERE ms.profile_id = $1
       AND ms.category = 'garment'
       AND mv.workspace_id = $2`,
    [measurementProfileId, workspaceId],
  );

  const body: Record<string, number> = {};
  for (const row of bodyRows as Record<string, unknown>[]) {
    body[row.code as string] = Number(row.canonical_value_cm);
  }

  const garment: Record<string, number> = {};
  for (const row of garmentRows as Record<string, unknown>[]) {
    garment[row.code as string] = Number(row.canonical_value_cm);
  }

  const status = profile.status as string;
  const warnings: string[] = [];
  if (status === 'DRAFT') {
    warnings.push('Measurement profile is in DRAFT status — validate before using in Design Studio.');
  }

  return {
    profileId: measurementProfileId,
    profileVersion: Number(profile.version),
    canonicalUnit: 'cm',
    body,
    garment: Object.keys(garment).length > 0 ? garment : undefined,
    validation: {
      status: (['VALIDATED', 'ACTIVE', 'DRAFT'].includes(status)
        ? status
        : 'unknown') as DesignMeasurementContext['validation']['status'],
      warnings,
    },
  };
}

/**
 * Compute measurement-based design suggestions (deterministic — no AI).
 * Example: bust + ease → suggested finished chest measurement.
 * NEVER silently changes customer measurements.
 */
export interface DesignSuggestion {
  area: string;
  bodyMeasurementCm: number;
  easeCm: number;
  suggestedFinishedCm: number;
  source: string;
}

const DEFAULT_EASE: Record<string, number> = {
  bust_circumference: 6,
  waist_circumference: 4,
  hip_circumference: 6,
};

export function computeDesignSuggestions(
  context: DesignMeasurementContext,
  fit: string = 'regular',
): DesignSuggestion[] {
  const fitMultiplier: Record<string, number> = {
    fitted: 0.5,
    slim: 0.7,
    regular: 1.0,
    relaxed: 1.5,
    loose: 2.0,
    oversized: 2.5,
    custom: 1.0,
  };
  const mult = fitMultiplier[fit] ?? 1.0;

  const suggestions: DesignSuggestion[] = [];
  for (const [code, baseEase] of Object.entries(DEFAULT_EASE)) {
    const bodyVal = context.body[code];
    if (bodyVal === undefined) continue;
    const easeCm = Math.round(baseEase * mult * 10) / 10;
    suggestions.push({
      area: code,
      bodyMeasurementCm: bodyVal,
      easeCm,
      suggestedFinishedCm: Math.round((bodyVal + easeCm) * 10) / 10,
      source: `Body measurement (${bodyVal.toFixed(1)} cm) + ${fit} ease (${easeCm.toFixed(1)} cm)`,
    });
  }
  return suggestions;
}
