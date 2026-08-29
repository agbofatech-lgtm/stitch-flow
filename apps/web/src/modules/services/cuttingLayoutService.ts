/**
 * Phase 15 — Cutting Layout Service.
 *
 * Deterministic greedy nesting algorithm for cutting layout computation.
 *
 * CONSTRAINTS:
 * - Greedy deterministic — bounded execution time, offline-capable
 * - NO genetic algorithms, NO annealing, NO random restarts
 * - Layout envelope = max occupied Y + marginCm (NOT area ÷ width)
 * - Labeled "CUTTING LAYOUT LENGTH" — NEVER "FINAL FABRIC YARDAGE"
 * - Phase 16 owns authoritative fabric consumption / yardage
 * - Pattern matching geometry never faked — flagged for manual verification
 * - Directional fabrics: all pieces placed with same orientation (0° only)
 * - Non-directional: pieces may be rotated 180° to save space
 * - Mirror/cut-on-fold: half-width placement, noted in instructions
 * - Offline-first: persisted to Dexie v5 patternModelsV15 adjacent store
 *
 * Algorithm:
 * 1. Sort pieces by effective height (descending) — tallest first
 * 2. For each piece copy: place at lowest available Y in leftmost X that fits
 * 3. Track strip occupancy with height map
 * 4. Layout envelope = max bottom edge Y of all placed pieces + margin
 */

import { db } from '../../db/database';
import { computeBoundingBox } from './patternIntelligenceService';
import type { FabricProfile } from '../../shared/api/design';
import type {
  PatternModel,
  PatternPiece,
  CuttingLayout,
  PlacedPiece,
  LayoutValidationIssue,
} from '../../shared/api/pattern';

// ---------------------------------------------------------------------------
// Greedy nesting implementation
// ---------------------------------------------------------------------------

const SEAM_GAP_CM = 0.5;  // gap between pieces for cutting room
const DEFAULT_MARGIN_CM = 2.0;  // top and bottom margin

interface PieceToPlace {
  piece: PatternPiece;
  copy: number;
  widthCm: number;
  heightCm: number;
  rotationAllowed: boolean;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Strip-based height map for greedy placement.
 * Tracks the current "floor" (lowest available Y) at each X strip.
 * Strip resolution: 0.5 cm
 */
class HeightMap {
  private strips: number[];
  private stripWidth: number;
  private layoutWidth: number;

  constructor(layoutWidthCm: number, stripWidthCm = 0.5) {
    this.layoutWidth = layoutWidthCm;
    this.stripWidth = stripWidthCm;
    const count = Math.ceil(layoutWidthCm / stripWidthCm);
    this.strips = new Array(count).fill(0);
  }

  /**
   * Find the lowest Y position where a piece of (widthCm × heightCm) fits.
   * Returns { x, y } or null if it doesn't fit in the layout width.
   */
  findPlacement(widthCm: number, heightCm: number): { x: number; y: number } | null {
    if (widthCm > this.layoutWidth) return null;

    const numStrips = Math.ceil(widthCm / this.stripWidth);
    const maxStartStrip = this.strips.length - numStrips;

    let bestY = Infinity;
    let bestX = 0;

    for (let i = 0; i <= maxStartStrip; i++) {
      // Find max height in the range [i, i+numStrips)
      let floorY = 0;
      for (let j = i; j < i + numStrips; j++) {
        if (this.strips[j] > floorY) floorY = this.strips[j];
      }
      // Add gap
      const candidateY = floorY > 0 ? floorY + SEAM_GAP_CM : 0;
      if (candidateY < bestY) {
        bestY = candidateY;
        bestX = round2(i * this.stripWidth);
      }
    }

    return bestY === Infinity ? null : { x: round2(bestX), y: round2(bestY) };
  }

  /**
   * Mark strips occupied by a placed piece.
   */
  place(xCm: number, widthCm: number, heightCm: number): void {
    const startStrip = Math.floor(xCm / this.stripWidth);
    const endStrip = Math.min(
      this.strips.length,
      Math.ceil((xCm + widthCm) / this.stripWidth),
    );
    const bottom = round2(
      (this.strips[startStrip] > 0 ? this.strips[startStrip] : 0) + heightCm,
    );
    for (let i = startStrip; i < endStrip; i++) {
      this.strips[i] = Math.max(this.strips[i], bottom);
    }
  }

  maxOccupiedY(): number {
    return this.strips.reduce((m, v) => Math.max(m, v), 0);
  }
}

/** Place all piece copies using greedy strip nesting. */
function greedyNest(
  piecesToPlace: PieceToPlace[],
  layoutWidthCm: number,
  isDirectional: boolean,
): PlacedPiece[] {
  // Sort by height descending (tallest pieces first for better packing)
  const sorted = [...piecesToPlace].sort((a, b) => b.heightCm - a.heightCm);

  const heightMap = new HeightMap(layoutWidthCm);
  const placed: PlacedPiece[] = [];

  for (const item of sorted) {
    let widthCm = item.widthCm;
    let heightCm = item.heightCm;
    let rotationDeg = 0;

    // Try placement at 0°
    let position = heightMap.findPlacement(widthCm, heightCm);

    // For non-directional fabrics, try 90° rotation if 0° doesn't fit
    if (position === null && !isDirectional && !item.piece.constraints.includes('cut_on_fold')) {
      // Swap dimensions (rotate 90°)
      const tmp = widthCm;
      widthCm = heightCm;
      heightCm = tmp;
      rotationDeg = 90;
      position = heightMap.findPlacement(widthCm, heightCm);
    }

    if (position === null) {
      // Piece is wider than layout — flag but place at y=0 for visibility
      placed.push({
        pieceId: item.piece.id,
        copy: item.copy,
        xCm: 0,
        yCm: 0,
        rotationDeg,
        flipped: false,
        effectiveWidthCm: widthCm,
        effectiveHeightCm: heightCm,
      });
    } else {
      placed.push({
        pieceId: item.piece.id,
        copy: item.copy,
        xCm: position.x,
        yCm: position.y,
        rotationDeg,
        flipped: false,
        effectiveWidthCm: widthCm,
        effectiveHeightCm: heightCm,
      });
      heightMap.place(position.x, widthCm, heightCm);
    }
  }

  return placed;
}

// ---------------------------------------------------------------------------
// Layout validation
// ---------------------------------------------------------------------------

function validateLayout(
  placedPieces: PlacedPiece[],
  pieces: PatternPiece[],
  layoutWidthCm: number,
  isDirectional: boolean,
): LayoutValidationIssue[] {
  const issues: LayoutValidationIssue[] = [];
  const pieceMap = new Map(pieces.map((p) => [p.id, p]));

  for (const pp of placedPieces) {
    const piece = pieceMap.get(pp.pieceId);
    if (!piece) continue;

    // Width overflow
    if (pp.xCm + pp.effectiveWidthCm > layoutWidthCm + 0.01) {
      issues.push({
        severity: 'error',
        code: 'PIECE_EXCEEDS_WIDTH',
        message: `"${piece.name}" (copy ${pp.copy}) exceeds fabric width: piece right edge at ${round2(pp.xCm + pp.effectiveWidthCm)} cm, fabric width ${layoutWidthCm} cm.`,
        pieceIds: [pp.pieceId],
      });
    }

    // Directional violation
    if (isDirectional && pp.rotationDeg !== 0) {
      issues.push({
        severity: 'error',
        code: 'DIRECTIONAL_ROTATION_VIOLATION',
        message: `"${piece.name}" is rotated ${pp.rotationDeg}° but fabric is directional — all pieces must be oriented the same direction.`,
        pieceIds: [pp.pieceId],
      });
    }

    // Grainline on bias for directional fabric
    if (isDirectional && piece.grainline === 'bias') {
      issues.push({
        severity: 'warning',
        code: 'BIAS_ON_DIRECTIONAL_FABRIC',
        message: `"${piece.name}" is cut on bias but fabric is directional. Verify grain direction with tailor.`,
        pieceIds: [pp.pieceId],
      });
    }

    // Pattern matching flag
    if (piece.patternMatchingManualVerificationRequired) {
      issues.push({
        severity: 'warning',
        code: 'PATTERN_MATCHING_MANUAL_VERIFICATION',
        message: `"${piece.name}" requires pattern matching — layout position must be verified manually before cutting.`,
        pieceIds: [pp.pieceId],
      });
    }
  }

  // Overlap detection (O(n²) — acceptable for typical piece counts 5-20)
  for (let i = 0; i < placedPieces.length; i++) {
    for (let j = i + 1; j < placedPieces.length; j++) {
      const a = placedPieces[i];
      const b = placedPieces[j];
      const overlapX = a.xCm < b.xCm + b.effectiveWidthCm && a.xCm + a.effectiveWidthCm > b.xCm;
      const overlapY = a.yCm < b.yCm + b.effectiveHeightCm && a.yCm + a.effectiveHeightCm > b.yCm;
      if (overlapX && overlapY) {
        const pa = pieceMap.get(a.pieceId);
        const pb = pieceMap.get(b.pieceId);
        issues.push({
          severity: 'error',
          code: 'PIECE_OVERLAP',
          message: `"${pa?.name ?? a.pieceId}" (copy ${a.copy}) overlaps with "${pb?.name ?? b.pieceId}" (copy ${b.copy}).`,
          pieceIds: [a.pieceId, b.pieceId],
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Main layout computation
// ---------------------------------------------------------------------------

function generateId(): string {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ComputeLayoutOptions {
  fabricProfile?: FabricProfile | null;
  /** Fabric width in cm. If not provided, uses fabricProfile.width.valueCm or defaults to 115 cm. */
  layoutWidthCm?: number;
  marginCm?: number;
  notes?: string;
}

/**
 * Compute a greedy deterministic cutting layout for a PatternModel.
 *
 * layoutEnvelopeCm = max occupied Y of all placed pieces + marginCm.
 * This is the CUTTING LAYOUT LENGTH — NOT final fabric yardage.
 * Phase 16 adds selvedge, repeat matching, and buffers.
 */
export async function computeCuttingLayout(
  model: PatternModel,
  customerId: string,
  workspaceId: string,
  opts: ComputeLayoutOptions = {},
): Promise<CuttingLayout> {
  const now = new Date().toISOString();
  const marginCm = opts.marginCm ?? DEFAULT_MARGIN_CM;

  // Resolve fabric width
  const fabricWidthCm = opts.layoutWidthCm
    ?? (opts.fabricProfile?.width?.value != null && opts.fabricProfile?.width?.unit === 'cm'
      ? opts.fabricProfile.width.value
      : opts.layoutWidthCm ?? 115); // 115 cm standard default

  const isDirectional = opts.fabricProfile?.properties?.directional ?? false;

  // Build list of all piece copies to place
  const piecesToPlace: PieceToPlace[] = [];
  for (const piece of model.pieces) {
    for (let copy = 1; copy <= piece.quantity; copy++) {
      const isFold = piece.constraints.includes('cut_on_fold');
      // Cut-on-fold pieces: half width (piece is cut at fold — effective fabric width is half)
      const effectiveWidth = isFold
        ? round2(piece.boundingBox.widthCm)  // Width is already half (folded piece)
        : round2(piece.boundingBox.widthCm);
      piecesToPlace.push({
        piece,
        copy,
        widthCm: effectiveWidth,
        heightCm: round2(piece.boundingBox.heightCm),
        rotationAllowed: !isDirectional && !isFold,
      });
    }
  }

  // Run greedy nesting
  const placedPieces = greedyNest(piecesToPlace, fabricWidthCm, isDirectional);

  // Compute layout envelope
  let maxY = 0;
  for (const pp of placedPieces) {
    const bottom = pp.yCm + pp.effectiveHeightCm;
    if (bottom > maxY) maxY = bottom;
  }
  const layoutEnvelopeCm = round2(maxY + marginCm);

  // Validate layout
  const validationIssues = validateLayout(
    placedPieces,
    model.pieces,
    fabricWidthCm,
    isDirectional,
  );
  const isValid = validationIssues.filter((i) => i.severity === 'error').length === 0;

  const id = generateId();
  const layout: CuttingLayout = {
    id,
    workspaceId,
    customerId,
    patternModelId: model.id,
    fabricProfileId: opts.fabricProfile?.id ?? null,
    layoutWidthCm: fabricWidthCm,
    layoutEnvelopeCm,
    marginCm,
    placedPieces,
    validationIssues,
    isValid,
    algorithm: 'greedy_deterministic',
    algorithmVersion: '1.0.0',
    notes: opts.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  // Persist to Dexie v5 (offline-first)
  await db.cuttingLayoutsV15.put({
    ...layout,
    workspaceId,
    deletedAt: null,
    localUpdatedAt: now,
  });

  return layout;
}

/** Load cutting layout from Dexie by ID. */
export async function loadCuttingLayout(
  id: string,
  workspaceId: string,
): Promise<CuttingLayout | null> {
  const row = await db.cuttingLayoutsV15
    .where('[workspaceId+id]')
    .equals([workspaceId, id])
    .first();
  return row ? (row as unknown as CuttingLayout) : null;
}

/** List cutting layouts for a pattern model. */
export async function listLocalCuttingLayouts(
  patternModelId: string,
  workspaceId: string,
): Promise<CuttingLayout[]> {
  const rows = await db.cuttingLayoutsV15
    .where('workspaceId')
    .equals(workspaceId)
    .toArray();
  return (rows as unknown as Array<CuttingLayout & { deletedAt?: string | null }>)
    .filter((r) => r.patternModelId === patternModelId && !r.deletedAt);
}
