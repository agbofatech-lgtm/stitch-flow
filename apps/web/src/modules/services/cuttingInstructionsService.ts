/**
 * Phase 15 — Cutting Instructions Service.
 *
 * Generates deterministic per-piece cutting instructions from a PatternModel
 * and optional CuttingLayout. Instructions are human-readable and traceable.
 *
 * CONSTRAINTS:
 * - Instructions are deterministic — same input always produces same output
 * - Pattern matching never faked — "manual verification required" flag
 * - Directional fabric instructions always explicit
 * - Seam allowance always from engine metadata (never computed here)
 * - Cut-on-fold instructions always noted
 * - Mirror constraints always noted
 */

import type {
  PatternModel,
  PatternPiece,
  CuttingLayout,
  CuttingInstruction,
  CuttingInstructionSet,
  GrainlineDirection,
  PieceConstraint,
  PlacedPiece,
} from '../../shared/api/pattern';
import type { FabricProfile } from '../../shared/api/design';

// ---------------------------------------------------------------------------
// Per-piece instruction generator
// ---------------------------------------------------------------------------

function grainlineInstruction(grainline: GrainlineDirection): string {
  switch (grainline) {
    case 'lengthwise': return 'Align grainline parallel to selvage (lengthwise grain).';
    case 'crosswise': return 'Align grainline perpendicular to selvage (crosswise grain).';
    case 'bias': return 'Cut on 45° bias. Mark bias direction on fabric before cutting.';
    case 'any': return 'Grainline may be placed in any direction — confirm with tailor.';
  }
}

function constraintInstructions(constraints: PieceConstraint[], pieceName: string): string[] {
  const steps: string[] = [];
  if (constraints.includes('cut_on_fold')) {
    steps.push(`Place "${pieceName}" with the fold edge aligned to folded fabric. Cut along outer edges only — do not cut the fold line.`);
  }
  if (constraints.includes('mirror')) {
    steps.push(`"${pieceName}" is cut as a mirror pair. Flip the pattern piece before cutting the second copy, OR cut through double fabric with wrong sides together.`);
  }
  if (constraints.includes('directional')) {
    steps.push(`"${pieceName}" requires directional placement. Ensure all pieces face the same direction on the fabric.`);
  }
  return steps;
}

function positionInstruction(placed?: PlacedPiece): string | null {
  if (!placed) return null;
  return `Layout position: ${placed.xCm} cm from left edge, ${placed.yCm} cm from top of layout.`;
}

function buildPieceSteps(
  piece: PatternPiece,
  placed: PlacedPiece | null,
  fabricProfile?: FabricProfile | null,
): string[] {
  const steps: string[] = [];

  // Step 1: Position (if layout available)
  const posStep = positionInstruction(placed ?? undefined);
  if (posStep) steps.push(posStep);

  // Step 2: Grainline
  steps.push(grainlineInstruction(piece.grainline));

  // Step 3: Constraints
  steps.push(...constraintInstructions(piece.constraints, piece.name));

  // Step 4: Seam allowance
  steps.push(`Seam allowance: ${piece.seamAllowanceCm} cm included around all edges unless otherwise marked.`);

  // Step 5: Quantity
  if (piece.quantity === 1) {
    steps.push(`Cut 1 piece.`);
  } else {
    steps.push(`Cut ${piece.quantity} pieces total.`);
  }

  // Step 6: Ease note
  if (piece.appliedEaseCm && piece.appliedEaseCm > 0) {
    steps.push(`${piece.appliedEaseCm} cm ease has been applied to this piece. Finished measurement is body measurement + ease.`);
  }

  // Step 7: Directional fabric
  if (piece.requiresDirectionalFabric && fabricProfile?.properties?.directional) {
    steps.push(`Directional fabric: ensure top of pattern piece faces the same direction as all other pieces.`);
  }

  // Step 8: Pattern matching
  if (piece.requiresPatternMatching) {
    steps.push(`PATTERN MATCHING REQUIRED — manual verification required before cutting. Align pattern repeats at marked notch points.`);
  }

  // Step 9: Piece-specific notes
  for (const note of piece.notes) {
    if (!steps.some((s) => s.includes(note))) steps.push(note);
  }

  return steps;
}

function buildPieceWarnings(
  piece: PatternPiece,
  placed: PlacedPiece | null,
  layoutWidthCm?: number,
): string[] {
  const warnings: string[] = [];

  if (placed && layoutWidthCm) {
    const rightEdge = placed.xCm + placed.effectiveWidthCm;
    if (rightEdge > layoutWidthCm + 0.01) {
      warnings.push(`WARNING: piece extends ${(rightEdge - layoutWidthCm).toFixed(1)} cm beyond fabric width. Verify layout before cutting.`);
    }
  }

  if (piece.patternMatchingManualVerificationRequired) {
    warnings.push(`PATTERN MATCHING: position must be manually verified at repeat alignment points before cutting.`);
  }

  if (piece.boundingBox.widthCm === 0 && piece.boundingBox.heightCm === 0) {
    warnings.push(`Piece dimensions could not be determined — verify measurements before cutting.`);
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Instruction Set generator
// ---------------------------------------------------------------------------

function generatePreamble(
  model: PatternModel,
  layout: CuttingLayout | null,
  fabricProfile?: FabricProfile | null,
): string[] {
  const lines: string[] = [];

  lines.push(`CUTTING INSTRUCTIONS — ${model.name}`);
  lines.push(`Pattern derived from: ${model.garmentCategory} (engine: ${model.engineKind})`);

  if (layout) {
    lines.push(`CUTTING LAYOUT LENGTH: ${layout.layoutEnvelopeCm} cm`);
    lines.push(`Fabric width: ${layout.layoutWidthCm} cm`);
    lines.push(`NOTE: The cutting layout length is a geometric envelope only. Final fabric yardage (including selvedge, waste, and repeat matching allowance) is determined separately.`);
  }

  if (fabricProfile) {
    lines.push(`Fabric: ${fabricProfile.name}${fabricProfile.fabricType ? ` (${fabricProfile.fabricType})` : ''}`);
    if (fabricProfile.properties?.directional) {
      lines.push(`DIRECTIONAL FABRIC: All pieces must be oriented in the same direction.`);
    }
    if (fabricProfile.properties?.requiresMatching) {
      lines.push(`PATTERN MATCHING REQUIRED: Manually verify all pattern repeat alignments before cutting.`);
    }
  }

  const hasDefaults = model.derivationContext.defaultsAccepted?.length > 0;
  if (hasDefaults) {
    lines.push(`ESTIMATED MEASUREMENTS: ${model.derivationContext.defaultsAccepted.length} measurement(s) used engine defaults (tailor-accepted). Verify fit before final cutting.`);
  }

  if (model.derivationContext.warnings.length > 0) {
    lines.push(`DERIVATION WARNINGS: ${model.derivationContext.warnings.join(' | ')}`);
  }

  return lines;
}

function generatePostCuttingChecks(): string[] {
  return [
    'Mark all notch points with tailor\'s chalk or notch cuts.',
    'Label each piece with garment name, piece name, and quantity.',
    'Transfer any pattern markings (darts, pleats, pocket positions) to fabric.',
    'Check that all pieces have correct number of cuts.',
    'Verify seam allowances are consistent across all pieces.',
    'For pattern-matching fabrics: verify match points before sewing.',
    'Bundle corresponding pieces together (e.g., left and right pairs).',
    'Confirm all pieces against cutting list before proceeding to sewing.',
  ];
}

function generateId(): string {
  return `cis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a complete CuttingInstructionSet for a PatternModel.
 * Optionally uses a CuttingLayout for position references.
 */
export function generateCuttingInstructions(
  model: PatternModel,
  workspaceId: string,
  layout?: CuttingLayout | null,
  fabricProfile?: FabricProfile | null,
): CuttingInstructionSet {
  const now = new Date().toISOString();

  // Build a map of placed pieces for position lookup
  const placedMap = new Map<string, PlacedPiece>();
  if (layout) {
    for (const pp of layout.placedPieces) {
      // Key by pieceId + copy
      placedMap.set(`${pp.pieceId}-${pp.copy}`, pp);
    }
  }

  // Generate per-piece instructions
  const instructions: CuttingInstruction[] = model.pieces.map((piece) => {
    // Use the first copy's position for instruction reference
    const placed = placedMap.get(`${piece.id}-1`) ?? null;

    const steps = buildPieceSteps(piece, placed, fabricProfile);
    const warnings = buildPieceWarnings(piece, placed, layout?.layoutWidthCm);

    return {
      pieceId: piece.id,
      pieceName: piece.name,
      quantity: piece.quantity,
      layoutPosition: placed ? { xCm: placed.xCm, yCm: placed.yCm } : null,
      seamAllowanceCm: piece.seamAllowanceCm,
      grainline: piece.grainline,
      constraints: piece.constraints,
      steps,
      warnings,
    } satisfies CuttingInstruction;
  });

  const preamble = generatePreamble(model, layout ?? null, fabricProfile);
  const postCuttingChecks = generatePostCuttingChecks();

  return {
    id: generateId(),
    workspaceId,
    patternModelId: model.id,
    cuttingLayoutId: layout?.id ?? null,
    fabricProfileId: fabricProfile?.id ?? null,
    instructions,
    preamble,
    postCuttingChecks,
    createdAt: now,
  };
}
