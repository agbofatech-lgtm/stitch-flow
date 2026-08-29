/**
 * Phase 14 — Fabric Profile Service.
 * Records the actual fabric brought by the customer.
 * Available length ≠ required length — yardage calculation is Phase 16.
 * Width/length stored with canonical cm + original value/unit preserved.
 */
import { randomUUID } from 'node:crypto';
import { pool } from '../../config/db';
import { ApiError } from '../../utils/apiError';
import type { FabricProfile, FabricWidthUnit, FabricLengthUnit } from './types';

// Unit conversion helpers
function widthToCm(value: number, unit: FabricWidthUnit): number {
  return unit === 'inch' ? Math.round(value * 2.54 * 10000) / 10000 : value;
}

function lengthToCm(value: number, unit: FabricLengthUnit): number {
  if (unit === 'yard') return Math.round(value * 91.44 * 10000) / 10000;
  if (unit === 'meter') return Math.round(value * 100 * 10000) / 10000;
  return value;
}

function rowToFabric(r: Record<string, unknown>): FabricProfile {
  return {
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    name: r.name as string,
    localAssetId: (r.local_asset_id as string) ?? null,
    fabricType: (r.fabric_type as string) ?? null,
    width:
      r.width_original_value != null && r.width_original_unit != null
        ? { value: Number(r.width_original_value), unit: r.width_original_unit as FabricWidthUnit }
        : null,
    availableLength:
      r.length_original_value != null && r.length_original_unit != null
        ? { value: Number(r.length_original_value), unit: r.length_original_unit as FabricLengthUnit }
        : null,
    properties: {
      directional: r.directional != null ? Boolean(r.directional) : undefined,
      patternRepeat: r.pattern_repeat != null ? Boolean(r.pattern_repeat) : undefined,
      patternRepeatSizeCm: r.pattern_repeat_size_cm != null ? Number(r.pattern_repeat_size_cm) : null,
      requiresMatching: r.requires_matching != null ? Boolean(r.requires_matching) : undefined,
      stretch: (r.stretch as FabricProfile['properties']['stretch']) ?? undefined,
      transparency: (r.transparency as FabricProfile['properties']['transparency']) ?? undefined,
    },
    notes: (r.notes as string) ?? '',
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function listFabricProfiles(workspaceId: string): Promise<FabricProfile[]> {
  const { rows } = await pool.query(
    'SELECT * FROM fabric_profiles WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200',
    [workspaceId],
  );
  return rows.map((r) => rowToFabric(r as Record<string, unknown>));
}

export async function getFabricProfile(
  workspaceId: string,
  id: string,
): Promise<FabricProfile> {
  const { rows } = await pool.query(
    'SELECT * FROM fabric_profiles WHERE id=$1 AND workspace_id=$2',
    [id, workspaceId],
  );
  if (rows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Fabric profile not found');
  return rowToFabric(rows[0] as Record<string, unknown>);
}

export interface FabricProfileInput {
  id?: string;
  name: string;
  localAssetId?: string | null;
  fabricType?: string | null;
  width?: { value: number; unit: FabricWidthUnit } | null;
  availableLength?: { value: number; unit: FabricLengthUnit } | null;
  properties?: {
    directional?: boolean;
    patternRepeat?: boolean;
    patternRepeatSizeCm?: number | null;
    requiresMatching?: boolean;
    stretch?: FabricProfile['properties']['stretch'];
    transparency?: FabricProfile['properties']['transparency'];
  };
  notes?: string;
}

export async function createFabricProfile(
  workspaceId: string,
  input: FabricProfileInput,
): Promise<FabricProfile> {
  const id = input.id || `fab-${randomUUID()}`;
  const widthCm = input.width ? widthToCm(input.width.value, input.width.unit) : null;
  const lengthCm = input.availableLength
    ? lengthToCm(input.availableLength.value, input.availableLength.unit)
    : null;
  const p = input.properties ?? {};
  const { rows } = await pool.query(
    `INSERT INTO fabric_profiles
       (id, workspace_id, name, local_asset_id, fabric_type,
        width_cm, width_original_value, width_original_unit,
        length_cm, length_original_value, length_original_unit,
        directional, pattern_repeat, pattern_repeat_size_cm,
        requires_matching, stretch, transparency, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      id, workspaceId, input.name.trim(),
      input.localAssetId ?? null,
      input.fabricType ?? null,
      widthCm, input.width?.value ?? null, input.width?.unit ?? null,
      lengthCm, input.availableLength?.value ?? null, input.availableLength?.unit ?? null,
      p.directional ?? null,
      p.patternRepeat ?? null,
      p.patternRepeatSizeCm ?? null,
      p.requiresMatching ?? null,
      p.stretch ?? null,
      p.transparency ?? null,
      input.notes?.trim() ?? '',
    ],
  );
  return rowToFabric(rows[0] as Record<string, unknown>);
}

export async function updateFabricProfile(
  workspaceId: string,
  id: string,
  update: Partial<FabricProfileInput>,
): Promise<FabricProfile> {
  await getFabricProfile(workspaceId, id); // asserts ownership
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [id, workspaceId];
  let idx = 3;

  const push = (col: string, val: unknown) => {
    sets.push(`${col} = $${idx++}`);
    params.push(val);
  };

  if (update.name !== undefined) push('name', update.name.trim());
  if (update.localAssetId !== undefined) push('local_asset_id', update.localAssetId);
  if (update.fabricType !== undefined) push('fabric_type', update.fabricType);
  if (update.width !== undefined) {
    push('width_original_value', update.width?.value ?? null);
    push('width_original_unit', update.width?.unit ?? null);
    push('width_cm', update.width ? widthToCm(update.width.value, update.width.unit) : null);
  }
  if (update.availableLength !== undefined) {
    push('length_original_value', update.availableLength?.value ?? null);
    push('length_original_unit', update.availableLength?.unit ?? null);
    push('length_cm', update.availableLength ? lengthToCm(update.availableLength.value, update.availableLength.unit) : null);
  }
  if (update.notes !== undefined) push('notes', update.notes.trim());
  if (update.properties) {
    const p = update.properties;
    if (p.directional !== undefined) push('directional', p.directional);
    if (p.patternRepeat !== undefined) push('pattern_repeat', p.patternRepeat);
    if (p.patternRepeatSizeCm !== undefined) push('pattern_repeat_size_cm', p.patternRepeatSizeCm);
    if (p.requiresMatching !== undefined) push('requires_matching', p.requiresMatching);
    if (p.stretch !== undefined) push('stretch', p.stretch);
    if (p.transparency !== undefined) push('transparency', p.transparency);
  }

  const { rows } = await pool.query(
    `UPDATE fabric_profiles SET ${sets.join(', ')} WHERE id=$1 AND workspace_id=$2 RETURNING *`,
    params,
  );
  return rowToFabric(rows[0] as Record<string, unknown>);
}

export async function deleteFabricProfile(workspaceId: string, id: string): Promise<void> {
  await getFabricProfile(workspaceId, id);
  await pool.query('DELETE FROM fabric_profiles WHERE id=$1 AND workspace_id=$2', [id, workspaceId]);
}
