/**
 * Phase 15 — Pattern Intelligence Service (backend).
 *
 * Backend service for Pattern Models and Cutting Layouts.
 * Pure functions + DB persistence. No pattern engine — the engine runs on the
 * frontend (patternEngine.ts) — the backend stores and validates the derived results.
 *
 * ARCHITECTURAL BOUNDARIES:
 * - The backend does NOT call patternEngine.ts (frontend-only).
 * - The backend stores PatternModel records produced by the frontend service.
 * - Backend validates inputs and enforces workspace isolation.
 * - Measurement completeness results are stored, not recomputed server-side.
 * - Layout envelope validation is deterministic (no random/ML).
 * - layout_envelope_cm is always labeled CUTTING LAYOUT LENGTH — not final yardage.
 */

import type { Pool } from 'pg';
import type {
  PatternModel,
  PatternModelStatus,
  CuttingLayout,
  CuttingInstructionSet,
  PlacedPiece,
  PatternReadinessReport,
  PatternReadinessStatus,
  PatternTraceabilityChain,
  LayoutValidationIssue,
} from './types';

// ---------------------------------------------------------------------------
// Pattern Model CRUD
// ---------------------------------------------------------------------------

export async function createPatternModel(
  pool: Pool,
  workspaceId: string,
  customerId: string | null,
  data: Omit<PatternModel, 'createdAt' | 'updatedAt'>,
): Promise<PatternModel> {
  const now = new Date().toISOString();
  const result = await pool.query(
    `INSERT INTO pattern_models
       (id, workspace_id, customer_id, name, version,
        design_specification_id, measurement_profile_id, measurement_profile_version,
        garment_category, engine_kind, derivation_context, measurement_completeness,
        status, notes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      data.id,
      workspaceId,
      customerId,
      data.name,
      data.version,
      data.designSpecificationId,
      data.measurementProfileId,
      data.measurementProfileVersion,
      data.garmentCategory,
      data.engineKind,
      JSON.stringify(data.derivationContext),
      JSON.stringify(data.measurementCompleteness),
      data.status,
      data.notes ?? null,
      now,
      now,
    ],
  );
  const row = result.rows[0];

  // Insert piece records
  for (let i = 0; i < data.pieces.length; i++) {
    const piece = data.pieces[i];
    await pool.query(
      `INSERT INTO pattern_model_pieces
         (id, pattern_model_id, workspace_id, name, quantity,
          outline_cm, bounding_box_width_cm, bounding_box_height_cm, bounding_box_area_cm2,
          seam_allowance_cm, applied_ease_cm, grainline, constraints,
          requires_directional_fabric, requires_pattern_matching,
          pattern_matching_manual_verification, notes, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        piece.id,
        data.id,
        workspaceId,
        piece.name,
        piece.quantity,
        JSON.stringify(piece.outlineCm),
        piece.boundingBox.widthCm,
        piece.boundingBox.heightCm,
        piece.boundingBox.areaCm2,
        piece.seamAllowanceCm,
        piece.appliedEaseCm ?? null,
        piece.grainline,
        JSON.stringify(piece.constraints),
        piece.requiresDirectionalFabric,
        piece.requiresPatternMatching,
        piece.patternMatchingManualVerificationRequired,
        JSON.stringify(piece.notes),
        i,
      ],
    );
  }

  // Create initial version snapshot
  const versionId = `pmv-${data.id}-1`;
  await pool.query(
    `INSERT INTO pattern_model_versions (id, pattern_model_id, workspace_id, version, snapshot, reason)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [versionId, data.id, workspaceId, 1, JSON.stringify(data), 'initial derivation'],
  );

  return rowToPatternModel(row, data.pieces);
}

export async function getPatternModel(
  pool: Pool,
  workspaceId: string,
  id: string,
): Promise<PatternModel | null> {
  const result = await pool.query(
    'SELECT * FROM pattern_models WHERE id=$1 AND workspace_id=$2',
    [id, workspaceId],
  );
  if (!result.rows[0]) return null;
  const pieces = await getPiecesForModel(pool, id, workspaceId);
  return rowToPatternModel(result.rows[0], pieces);
}

export async function listPatternModels(
  pool: Pool,
  workspaceId: string,
  customerId: string,
): Promise<PatternModel[]> {
  const result = await pool.query(
    `SELECT * FROM pattern_models WHERE workspace_id=$1 AND customer_id=$2 ORDER BY created_at DESC`,
    [workspaceId, customerId],
  );
  const models: PatternModel[] = [];
  for (const row of result.rows) {
    const pieces = await getPiecesForModel(pool, row.id, workspaceId);
    models.push(rowToPatternModel(row, pieces));
  }
  return models;
}

export async function updatePatternModelStatus(
  pool: Pool,
  workspaceId: string,
  id: string,
  status: PatternModelStatus,
  notes?: string,
): Promise<PatternModel | null> {
  const now = new Date().toISOString();
  const result = await pool.query(
    `UPDATE pattern_models SET status=$1, notes=COALESCE($2,notes), updated_at=$3
     WHERE id=$4 AND workspace_id=$5 RETURNING *`,
    [status, notes ?? null, now, id, workspaceId],
  );
  if (!result.rows[0]) return null;
  const pieces = await getPiecesForModel(pool, id, workspaceId);
  return rowToPatternModel(result.rows[0], pieces);
}

async function getPiecesForModel(
  pool: Pool,
  modelId: string,
  workspaceId: string,
): Promise<PatternModel['pieces']> {
  const result = await pool.query(
    `SELECT * FROM pattern_model_pieces
     WHERE pattern_model_id=$1 AND workspace_id=$2 ORDER BY display_order`,
    [modelId, workspaceId],
  );
  return result.rows.map(rowToPiece);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPatternModel(row: Record<string, any>, pieces: PatternModel['pieces']): PatternModel {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    customerId: row.customer_id ?? null,
    name: row.name,
    version: row.version,
    designSpecificationId: row.design_specification_id,
    measurementProfileId: row.measurement_profile_id,
    measurementProfileVersion: row.measurement_profile_version,
    garmentCategory: row.garment_category,
    pieces,
    derivationContext: typeof row.derivation_context === 'string'
      ? JSON.parse(row.derivation_context) : row.derivation_context,
    measurementCompleteness: typeof row.measurement_completeness === 'string'
      ? JSON.parse(row.measurement_completeness) : row.measurement_completeness,
    engineKind: row.engine_kind,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date
      ? row.updated_at.toISOString() : row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPiece(row: Record<string, any>): PatternModel['pieces'][number] {
  const parseJson = (v: unknown) => typeof v === 'string' ? JSON.parse(v) : v;
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    outlineCm: parseJson(row.outline_cm) ?? [],
    boundingBox: {
      widthCm: Number(row.bounding_box_width_cm),
      heightCm: Number(row.bounding_box_height_cm),
      areaCm2: Number(row.bounding_box_area_cm2),
    },
    seamAllowanceCm: Number(row.seam_allowance_cm),
    appliedEaseCm: row.applied_ease_cm != null ? Number(row.applied_ease_cm) : null,
    grainline: row.grainline,
    constraints: parseJson(row.constraints) ?? [],
    requiresDirectionalFabric: row.requires_directional_fabric,
    requiresPatternMatching: row.requires_pattern_matching,
    patternMatchingManualVerificationRequired: row.pattern_matching_manual_verification,
    notes: parseJson(row.notes) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Pattern Readiness
// ---------------------------------------------------------------------------

export function computePatternReadiness(
  hasDesignSpec: boolean,
  designSpecStatus: string | null,
  measurementComplete: boolean,
  needsDefaults: boolean,
  hasPatternModel: boolean,
  hasCuttingLayout: boolean,
): PatternReadinessReport {
  const items: PatternReadinessReport['items'] = [];

  items.push({
    key: 'design_spec',
    label: 'Design Specification',
    satisfied: hasDesignSpec,
    warning: hasDesignSpec ? null : 'A Design Specification is required before deriving a pattern.',
  });

  items.push({
    key: 'design_ready',
    label: 'Design Status',
    satisfied: hasDesignSpec && ['validated', 'ready_for_pattern', 'ready_for_design'].includes(designSpecStatus ?? ''),
    warning: (!hasDesignSpec || !['validated', 'ready_for_pattern', 'ready_for_design'].includes(designSpecStatus ?? ''))
      ? 'Design Specification should be in validated or ready_for_pattern status.'
      : null,
  });

  items.push({
    key: 'measurements',
    label: 'Measurements Complete',
    satisfied: measurementComplete,
    warning: measurementComplete ? null : 'Required measurements are missing. Use [Use Estimate] or [Enter Manually].',
  });

  items.push({
    key: 'pattern_derived',
    label: 'Pattern Derived',
    satisfied: hasPatternModel,
    warning: hasPatternModel ? null : 'Pattern has not been derived yet.',
  });

  items.push({
    key: 'cutting_layout',
    label: 'Cutting Layout Computed',
    satisfied: hasCuttingLayout,
    warning: hasCuttingLayout ? null : 'Cutting layout has not been computed yet.',
  });

  let status: PatternReadinessStatus;
  if (!hasDesignSpec) status = 'no_design_spec';
  else if (!measurementComplete && needsDefaults) status = 'measurements_need_defaults';
  else if (!measurementComplete) status = 'measurements_incomplete';
  else if (hasCuttingLayout) status = 'ready_for_cutting';
  else if (hasPatternModel) status = 'pattern_derived';
  else status = 'ready_for_pattern';

  return {
    status,
    items,
    canDerivePattern: hasDesignSpec && (measurementComplete || needsDefaults),
    canComputeLayout: hasPatternModel,
    missingMeasurements: [],
  };
}

// ---------------------------------------------------------------------------
// Cutting Layout
// ---------------------------------------------------------------------------

export async function createCuttingLayout(
  pool: Pool,
  workspaceId: string,
  customerId: string | null,
  data: Omit<CuttingLayout, 'createdAt' | 'updatedAt'>,
): Promise<CuttingLayout> {
  const now = new Date().toISOString();
  const result = await pool.query(
    `INSERT INTO cutting_layouts
       (id, workspace_id, customer_id, pattern_model_id, fabric_profile_id,
        layout_width_cm, layout_envelope_cm, margin_cm,
        validation_issues, is_valid, algorithm, algorithm_version, notes,
        created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      data.id,
      workspaceId,
      customerId,
      data.patternModelId,
      data.fabricProfileId ?? null,
      data.layoutWidthCm,
      data.layoutEnvelopeCm,
      data.marginCm,
      JSON.stringify(data.validationIssues),
      data.isValid,
      data.algorithm,
      data.algorithmVersion,
      data.notes ?? null,
      now,
      now,
    ],
  );

  // Insert placed pieces
  for (let i = 0; i < data.placedPieces.length; i++) {
    const pp = data.placedPieces[i];
    await pool.query(
      `INSERT INTO cutting_layout_placed_pieces
         (id, cutting_layout_id, workspace_id, piece_id, copy_number,
          x_cm, y_cm, rotation_deg, flipped, effective_width_cm, effective_height_cm, placement_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        `clpp-${data.id}-${i}`,
        data.id,
        workspaceId,
        pp.pieceId,
        pp.copy,
        pp.xCm,
        pp.yCm,
        pp.rotationDeg,
        pp.flipped,
        pp.effectiveWidthCm,
        pp.effectiveHeightCm,
        i,
      ],
    );
  }

  return rowToCuttingLayout(result.rows[0], data.placedPieces, data.validationIssues);
}

export async function getCuttingLayout(
  pool: Pool,
  workspaceId: string,
  id: string,
): Promise<CuttingLayout | null> {
  const result = await pool.query(
    'SELECT * FROM cutting_layouts WHERE id=$1 AND workspace_id=$2',
    [id, workspaceId],
  );
  if (!result.rows[0]) return null;
  const pieces = await getPlacedPieces(pool, id, workspaceId);
  const parseJson = (v: unknown) => typeof v === 'string' ? JSON.parse(v) : v;
  return rowToCuttingLayout(result.rows[0], pieces, parseJson(result.rows[0].validation_issues));
}

export async function listCuttingLayouts(
  pool: Pool,
  workspaceId: string,
  customerId: string,
): Promise<CuttingLayout[]> {
  const result = await pool.query(
    `SELECT * FROM cutting_layouts WHERE workspace_id=$1 AND customer_id=$2 ORDER BY created_at DESC`,
    [workspaceId, customerId],
  );
  const layouts: CuttingLayout[] = [];
  for (const row of result.rows) {
    const pieces = await getPlacedPieces(pool, row.id, workspaceId);
    const parseJson = (v: unknown) => typeof v === 'string' ? JSON.parse(v) : v;
    layouts.push(rowToCuttingLayout(row, pieces, parseJson(row.validation_issues)));
  }
  return layouts;
}

async function getPlacedPieces(
  pool: Pool,
  layoutId: string,
  workspaceId: string,
): Promise<PlacedPiece[]> {
  const result = await pool.query(
    `SELECT * FROM cutting_layout_placed_pieces
     WHERE cutting_layout_id=$1 AND workspace_id=$2 ORDER BY placement_order`,
    [layoutId, workspaceId],
  );
  return result.rows.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: Record<string, any>): PlacedPiece => ({
      pieceId: r.piece_id,
      copy: r.copy_number,
      xCm: Number(r.x_cm),
      yCm: Number(r.y_cm),
      rotationDeg: Number(r.rotation_deg),
      flipped: r.flipped,
      effectiveWidthCm: Number(r.effective_width_cm),
      effectiveHeightCm: Number(r.effective_height_cm),
    }),
  );
}

function rowToCuttingLayout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Record<string, any>,
  placedPieces: PlacedPiece[],
  validationIssues: LayoutValidationIssue[],
): CuttingLayout {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    customerId: row.customer_id ?? null,
    patternModelId: row.pattern_model_id,
    fabricProfileId: row.fabric_profile_id ?? null,
    layoutWidthCm: Number(row.layout_width_cm),
    layoutEnvelopeCm: Number(row.layout_envelope_cm),
    marginCm: Number(row.margin_cm),
    placedPieces,
    validationIssues,
    isValid: row.is_valid,
    algorithm: 'greedy_deterministic',
    algorithmVersion: row.algorithm_version,
    notes: row.notes ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Cutting Instructions
// ---------------------------------------------------------------------------

export async function createCuttingInstructionSet(
  pool: Pool,
  workspaceId: string,
  data: CuttingInstructionSet,
): Promise<CuttingInstructionSet> {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO cutting_instruction_sets
       (id, workspace_id, pattern_model_id, cutting_layout_id, fabric_profile_id,
        instructions, preamble, post_cutting_checks, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      data.id,
      workspaceId,
      data.patternModelId,
      data.cuttingLayoutId ?? null,
      data.fabricProfileId ?? null,
      JSON.stringify(data.instructions),
      JSON.stringify(data.preamble),
      JSON.stringify(data.postCuttingChecks),
      now,
    ],
  );
  return { ...data, createdAt: now };
}

export async function getCuttingInstructionSet(
  pool: Pool,
  workspaceId: string,
  patternModelId: string,
  cuttingLayoutId?: string,
): Promise<CuttingInstructionSet | null> {
  let query = `SELECT * FROM cutting_instruction_sets
    WHERE workspace_id=$1 AND pattern_model_id=$2`;
  const params: (string | null)[] = [workspaceId, patternModelId];
  if (cuttingLayoutId) {
    query += ` AND cutting_layout_id=$3`;
    params.push(cuttingLayoutId);
  }
  query += ' ORDER BY created_at DESC LIMIT 1';
  const result = await pool.query(query, params);
  if (!result.rows[0]) return null;
  const parseJson = (v: unknown) => typeof v === 'string' ? JSON.parse(v) : v;
  const row = result.rows[0];
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    patternModelId: row.pattern_model_id,
    cuttingLayoutId: row.cutting_layout_id ?? null,
    fabricProfileId: row.fabric_profile_id ?? null,
    instructions: parseJson(row.instructions) ?? [],
    preamble: parseJson(row.preamble) ?? [],
    postCuttingChecks: parseJson(row.post_cutting_checks) ?? [],
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Traceability
// ---------------------------------------------------------------------------

export async function getTraceabilityChain(
  pool: Pool,
  workspaceId: string,
  patternModelId: string,
): Promise<PatternTraceabilityChain | null> {
  const pm = await getPatternModel(pool, workspaceId, patternModelId);
  if (!pm) return null;

  // Get design spec version
  const dsResult = await pool.query(
    `SELECT version FROM design_specifications WHERE id=$1 AND workspace_id=$2`,
    [pm.designSpecificationId, workspaceId],
  );
  const dsVersion = dsResult.rows[0]?.version ?? 1;

  // Get cutting layout if exists
  const clResult = await pool.query(
    `SELECT id FROM cutting_layouts WHERE pattern_model_id=$1 AND workspace_id=$2 ORDER BY created_at DESC LIMIT 1`,
    [patternModelId, workspaceId],
  );
  const cuttingLayoutId = clResult.rows[0]?.id ?? null;

  return {
    customerId: pm.customerId ?? '',
    measurementProfileId: pm.measurementProfileId,
    measurementProfileVersion: pm.measurementProfileVersion,
    designSpecificationId: pm.designSpecificationId,
    designSpecificationVersion: dsVersion,
    patternModelId: pm.id,
    patternModelVersion: pm.version,
    cuttingLayoutId,
    measuredAt: null,
    designedAt: null,
    patternDerivedAt: pm.createdAt,
    layoutComputedAt: cuttingLayoutId ? new Date().toISOString() : null,
  };
}
