/**
 * Phase 15 — Pattern Intelligence Service.
 *
 * Transforms patternEngine.ts output (via PatternAdapter) into structured
 * PatternModel data: derives PatternPiece[] with bounding boxes, grainlines,
 * seam allowances, mirror/fold constraints, and fabric direction requirements.
 *
 * Responsibilities:
 * - Derive PatternPiece[] from GenericPatternDraft.pieceNotes + outline polygon
 * - Compute bounding boxes from outline polygons (always present)
 * - Annotate grainline per piece type
 * - Annotate mirror / cut-on-fold / directional constraints per piece
 * - Apply FabricProfile constraints (directional, pattern matching)
 * - Persist PatternModel to Dexie v5 (offline-first)
 * - Never call productionAssistant.ts — pattern intelligence is standalone
 * - Never modify patternEngine.ts
 */

import { db } from '../../db/database';
import { runPatternAdapter, isGenericDraft } from './patternAdapter';
import type { DesignSpecification, FabricProfile } from '../../shared/api/design';
import type {
  PatternModel,
  PatternPiece,
  BoundingBox,
  PatternPoint,
  GrainlineDirection,
  PieceConstraint,
  PatternModelStatus,
  MeasurementCompletenessResult,
  PatternDerivationContext,
} from '../../shared/api/pattern';
import type { BodicePatternResult } from '../../types';

// ---------------------------------------------------------------------------
// Bounding box computation
// ---------------------------------------------------------------------------

/** Compute bounding box from a polygon outline (cm). */
export function computeBoundingBox(outline: PatternPoint[]): BoundingBox {
  if (outline.length === 0) {
    return { widthCm: 0, heightCm: 0, areaCm2: 0 };
  }
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of outline) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const widthCm = Math.round((maxX - minX) * 10) / 10;
  const heightCm = Math.round((maxY - minY) * 10) / 10;
  const areaCm2 = Math.round(widthCm * heightCm * 10) / 10;
  return { widthCm, heightCm, areaCm2 };
}

// ---------------------------------------------------------------------------
// Grainline annotation per piece name
// ---------------------------------------------------------------------------

function grainlineForPiece(pieceName: string, kind: string): GrainlineDirection {
  const n = pieceName.toLowerCase();
  // Bias-cut pieces
  if (n.includes('bias')) return 'bias';
  // Cross-grain
  if (n.includes('waistband') || n.includes('cuff') || n.includes('collar stand')) {
    return 'crosswise';
  }
  // Most structural pieces: lengthwise grain
  return 'lengthwise';
}

// ---------------------------------------------------------------------------
// Constraint annotation per piece name
// ---------------------------------------------------------------------------

function constraintsForPiece(pieceName: string, note?: string): PieceConstraint[] {
  const n = pieceName.toLowerCase();
  const noteL = (note ?? '').toLowerCase();
  const constraints: PieceConstraint[] = [];

  // Cut on fold
  if (n.includes('fold') || noteL.includes('cut on fold') || noteL.includes('fold')) {
    constraints.push('cut_on_fold');
  }
  // Mirror pairs
  if (n.includes('left') || n.includes('right') || n.includes(' ×2') ||
    noteL.includes('mirror') || noteL.includes('pair')) {
    constraints.push('mirror');
  }
  if (constraints.length === 0) constraints.push('none');
  return constraints;
}

// ---------------------------------------------------------------------------
// Piece notes for bodice (no pieceNotes in BodicePatternResult)
// ---------------------------------------------------------------------------

const BODICE_PIECE_NOTES = [
  { name: 'Front bodice', quantity: 1, note: 'Cut on fold or with seam allowance at CF' },
  { name: 'Back bodice', quantity: 1, note: 'Cut on fold if no back seam' },
  { name: 'Side panel', quantity: 2, note: 'Mirror pair' },
];

// ---------------------------------------------------------------------------
// Derive pieces from engine result
// ---------------------------------------------------------------------------

function derivePiecesFromGenericDraft(
  draft: import('./patternEngine').GenericPatternDraft,
  fabricProfile?: FabricProfile | null,
): PatternPiece[] {
  const baseOutline: PatternPoint[] = draft.outline.map((p) => ({ x: p.x, y: p.y }));
  const baseBbox = computeBoundingBox(baseOutline);

  const requiresDirectional = fabricProfile?.properties?.directional ?? false;
  const requiresMatching = fabricProfile?.properties?.requiresMatching ?? false;

  return draft.pieceNotes.map((pn, idx) => {
    // All pieces share the same foundation outline — in a production system each piece
    // would have its own polygon. Here we scale the outline proportionally by piece index
    // as an approximation for layout purposes. The tailor sees bounding boxes and quantities.
    const scaleFactor = idx === 0 ? 1.0 : Math.max(0.35, 1.0 - idx * 0.12);
    const pieceOutline: PatternPoint[] = baseOutline.map((p) => ({
      x: Math.round(p.x * scaleFactor * 10) / 10,
      y: Math.round(p.y * scaleFactor * 10) / 10,
    }));

    // Slice-based: some pieces use height-fraction
    const heightFraction =
      pn.name.toLowerCase().includes('sleeve') ? 0.6 :
      pn.name.toLowerCase().includes('collar') ? 0.15 :
      pn.name.toLowerCase().includes('waistband') ? 0.12 :
      pn.name.toLowerCase().includes('pocket') ? 0.25 :
      pn.name.toLowerCase().includes('fly') ? 0.18 :
      pn.name.toLowerCase().includes('facing') ? 0.22 : 1.0;

    const adjustedOutline: PatternPoint[] = pieceOutline.map((p) => ({
      x: p.x,
      y: Math.round(p.y * heightFraction * 10) / 10,
    }));
    const bbox = computeBoundingBox(adjustedOutline.length > 0 ? adjustedOutline : pieceOutline);

    const grainline = grainlineForPiece(pn.name, draft.kind);
    const constraints = constraintsForPiece(pn.name, pn.note);

    const notes: string[] = [];
    if (pn.note) notes.push(pn.note);
    if (requiresDirectional && grainline === 'lengthwise') {
      notes.push('Directional fabric — align top of piece with fabric top.');
    }
    if (requiresMatching) {
      notes.push('Pattern matching required — manual verification required before cutting.');
    }

    return {
      id: `piece-${draft.kind}-${idx}`,
      name: pn.name,
      quantity: pn.quantity,
      outlineCm: adjustedOutline,
      boundingBox: bbox,
      seamAllowanceCm: draft.seamAllowanceCm,
      appliedEaseCm: null,
      grainline,
      constraints,
      requiresDirectionalFabric: requiresDirectional,
      requiresPatternMatching: requiresMatching,
      patternMatchingManualVerificationRequired: requiresMatching,
      notes,
    } satisfies PatternPiece;
  });
}

function derivePiecesFromBodice(
  bodice: BodicePatternResult,
  kind: string,
  fabricProfile?: FabricProfile | null,
): PatternPiece[] {
  const requiresDirectional = fabricProfile?.properties?.directional ?? false;
  const requiresMatching = fabricProfile?.properties?.requiresMatching ?? false;

  return BODICE_PIECE_NOTES.map((pn, idx) => {
    // Build a rectangular outline from bodice control points
    const { controlPoints: cp } = bodice;
    const widthCm = Math.round(cp.B.x * 10) / 10;
    const heightCm = Math.round(cp.C.y * 10) / 10;
    const scaleFactor = idx === 0 ? 1.0 : idx === 1 ? 0.9 : 0.5;
    const w = Math.round(widthCm * scaleFactor * 10) / 10;
    const h = Math.round(heightCm * 10) / 10;
    const outline: PatternPoint[] = [
      { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h },
    ];
    const bbox = computeBoundingBox(outline);
    const grainline = grainlineForPiece(pn.name, kind);
    const constraints = constraintsForPiece(pn.name, pn.note);

    const notes: string[] = [];
    if (pn.note) notes.push(pn.note);
    if (requiresDirectional) notes.push('Directional fabric — align top of piece with fabric top.');
    if (requiresMatching) notes.push('Pattern matching required — manual verification required before cutting.');

    return {
      id: `piece-${kind}-${idx}`,
      name: pn.name,
      quantity: pn.quantity,
      outlineCm: outline,
      boundingBox: bbox,
      seamAllowanceCm: 1.5,
      appliedEaseCm: null,
      grainline,
      constraints,
      requiresDirectionalFabric: requiresDirectional,
      requiresPatternMatching: requiresMatching,
      patternMatchingManualVerificationRequired: requiresMatching,
      notes,
    } satisfies PatternPiece;
  });
}

// ---------------------------------------------------------------------------
// PatternModel creation
// ---------------------------------------------------------------------------

function generateId(): string {
  return `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface DerivePatternModelOptions {
  name?: string;
  defaultsAccepted?: Array<{ code: string; defaultCm: number }>;
  tailorOverrides?: Array<{ code: string; valueCm: number }>;
  fabricProfile?: FabricProfile | null;
  notes?: string;
}

/**
 * Derive a PatternModel from a Phase 14 DesignSpecification.
 * Persists to Dexie v5 (offline-first).
 * Never modifies patternEngine.ts.
 */
export async function derivePatternModel(
  spec: DesignSpecification,
  customerId: string,
  workspaceId: string,
  opts: DerivePatternModelOptions = {},
): Promise<PatternModel> {
  const now = new Date().toISOString();

  // 1. Run pattern adapter (wraps engine — no engine modification)
  const adapterResult = runPatternAdapter(spec, {
    defaultsAccepted: opts.defaultsAccepted,
    tailorOverrides: opts.tailorOverrides,
  });

  const { engineResult, derivationContext, measurementCompleteness } = adapterResult;

  // 2. Derive pieces
  let pieces: PatternPiece[];
  if (isGenericDraft(engineResult)) {
    pieces = derivePiecesFromGenericDraft(engineResult, opts.fabricProfile);
  } else {
    pieces = derivePiecesFromBodice(
      engineResult as BodicePatternResult,
      derivationContext.engineKind,
      opts.fabricProfile,
    );
  }

  // 3. Build PatternModel
  const id = generateId();
  const model: PatternModel = {
    id,
    workspaceId,
    customerId,
    name: opts.name ?? `Pattern — ${spec.name ?? spec.garment.category} (v1)`,
    version: 1,
    designSpecificationId: spec.id,
    measurementProfileId: derivationContext.measurementProfileId,
    measurementProfileVersion: derivationContext.measurementProfileVersion,
    garmentCategory: spec.garment.category,
    pieces,
    derivationContext,
    measurementCompleteness,
    engineKind: derivationContext.engineKind,
    status: 'derived',
    notes: opts.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  // 4. Persist to Dexie v5 (offline-first)
  await db.patternModelsV15.put({
    ...model,
    workspaceId,
    deletedAt: null,
    localUpdatedAt: now,
  });

  return model;
}

/** Load pattern model from Dexie by ID. */
export async function loadPatternModel(
  id: string,
  workspaceId: string,
): Promise<PatternModel | null> {
  const row = await db.patternModelsV15
    .where('[workspaceId+id]')
    .equals([workspaceId, id])
    .first();
  if (!row) return null;
  return row as unknown as PatternModel;
}

/** List all pattern models for a customer. */
export async function listLocalPatternModels(
  customerId: string,
  workspaceId: string,
): Promise<PatternModel[]> {
  const rows = await db.patternModelsV15
    .where('workspaceId')
    .equals(workspaceId)
    .toArray();
  return (rows as unknown as Array<PatternModel & { customerId?: string; deletedAt?: string | null }>)
    .filter((r) => r.customerId === customerId && !r.deletedAt);
}

/** Update pattern model status in Dexie. */
export async function updatePatternModelStatus(
  id: string,
  workspaceId: string,
  status: PatternModelStatus,
): Promise<void> {
  const now = new Date().toISOString();
  await db.patternModelsV15
    .where('[workspaceId+id]')
    .equals([workspaceId, id])
    .modify({ status, updatedAt: now, localUpdatedAt: now });
}
