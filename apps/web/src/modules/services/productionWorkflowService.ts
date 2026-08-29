/**
 * Phase 16 — Production Workflow Service.
 *
 * Generates deterministic garment-aware operation graph.
 * - Garment category drives operation set
 * - Operations have explicit dependencies
 * - Dependency graph is validated (no cycles)
 * - Time estimates use ranges (not false precision)
 * - Cutting execution plan is derived from layout constraints
 *
 * productionAssistant.ts is NEVER called — ZERO DIFF.
 * patternEngine.ts is NEVER called — ZERO DIFF.
 */

import type {
  CuttingExecutionStep,
  ProductionOperation,
  QualityCheckpoint,
  ProductionTimeEstimate,
  ProductionOperationStatus,
} from '../../shared/api/production';
import type { CuttingLayout } from '../../shared/api/pattern';
import type { FabricConsumption } from '../../shared/api/production';

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function generateId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function qcId(): string {
  return `qc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function time(min: number, expected: number, max: number, factors: string[]): ProductionTimeEstimate {
  return { minimumMinutes: min, expectedMinutes: expected, maximumMinutes: max, confidence: 'medium', factors };
}

// ---------------------------------------------------------------------------
// Cutting Execution Plan
// ---------------------------------------------------------------------------

/**
 * Generate the operational cutting sequence.
 * Extends Phase 15 cutting instructions with pre-cutting and QC steps.
 */
export function generateCuttingExecutionPlan(
  layout: CuttingLayout,
  consumption: FabricConsumption,
): CuttingExecutionStep[] {
  const steps: CuttingExecutionStep[] = [];
  let order = 1;

  const addStep = (
    code: string,
    title: string,
    description: string,
    required: boolean,
    verificationRequired: boolean,
    pieceIds: string[] = [],
  ) => {
    steps.push({ order: order++, code, title, description, required, verificationRequired, relatedPatternPieceIds: pieceIds });
  };

  addStep('INSPECT_FABRIC', 'Inspect Fabric',
    'Inspect entire fabric length for defects, holes, staining, or weave irregularities. Mark any defect areas before laying out.',
    true, true);

  addStep('CONFIRM_WIDTH', 'Confirm Usable Width',
    `Measure and confirm usable fabric width. Required: ${consumption.widthProfile.layoutRequiredWidthCm} cm. Usable (after selvedge): ${consumption.widthProfile.usableWidthCm} cm.`,
    true, true);

  if (consumption.shrinkage.percentage > 0) {
    addStep('PRE_SHRINK', 'Pre-Shrink Fabric',
      `Shrinkage allowance applied: ${consumption.shrinkage.percentage}% (Source: ${consumption.shrinkage.source}). Pre-wash and press fabric before cutting if required by fabric type.`,
      false, false);
  }

  addStep('ALIGN_GRAIN', 'Align Grain Direction',
    'Identify and align fabric grain direction. Ensure selvage edges are straight and parallel to the cutting table edge.',
    true, true);

  if (consumption.directional.required) {
    addStep('CONFIRM_DIRECTIONAL', 'Verify Directional Orientation',
      `DIRECTIONAL FABRIC: ${consumption.directional.notes.join(' ')} Confirm all pieces will be placed with correct top-up orientation before cutting.`,
      true, true);
  }

  if (consumption.patternMatching.required) {
    addStep('PATTERN_MATCHING', 'Verify Pattern Matching',
      `PATTERN MATCHING REQUIRED: ${consumption.patternMatching.notes.join(' ')} Manually align pattern repeats at all seam lines before finalising piece positions.`,
      true, true);
  }

  addStep('LAY_FABRIC', 'Lay Fabric on Cutting Table',
    'Lay fabric flat, smoothing out any wrinkles. Fold if cutting mirrored pairs on double layer.',
    true, false);

  addStep('PLACE_PIECES', 'Place Pattern Pieces',
    `Place pattern pieces as per cutting layout coordinates. Large pieces first. Layout width: ${layout.layoutWidthCm} cm. CUTTING LAYOUT LENGTH: ${layout.layoutEnvelopeCm} cm.`,
    true, false,
    layout.placedPieces.map((p) => p.pieceId));

  addStep('VERIFY_LAYOUT', 'Verify Layout Against Coordinates',
    'Confirm all piece positions match approved cutting layout. Check grainlines are correctly oriented.',
    true, true);

  addStep('MARK_NOTCHES', 'Mark Notches and Reference Points',
    'Mark all notch points, dart positions, pocket positions, and fold lines using tailor\'s chalk.',
    true, false);

  addStep('CUT_PRIMARY', 'Cut Primary Pieces',
    'Cut all primary structural pieces in order: body panels first, then shaped pieces.',
    true, false);

  addStep('CUT_SECONDARY', 'Cut Secondary Components',
    'Cut collars, cuffs, facings, waistbands, and other secondary components.',
    true, false);

  addStep('LABEL_PIECES', 'Label All Pieces',
    'Label each piece with: garment name, piece name, and quantity. Bundle corresponding mirror pairs.',
    true, false);

  addStep('CUTTING_QC', 'Cutting Quality Control',
    'Verify: correct pieces cut, correct quantities, grainlines correct, notches present, no fabric defects, pattern matching reviewed if required.',
    true, true);

  return steps;
}

// ---------------------------------------------------------------------------
// Garment-specific operation templates
// ---------------------------------------------------------------------------

interface OpTemplate {
  code: string;
  name: string;
  description: string;
  time: ProductionTimeEstimate;
  deps: string[]; // codes of dependency operations
  requiresCustomer: boolean;
  skills: string[];
}

function getOperationTemplates(garmentCategory: string): OpTemplate[] {
  const cat = garmentCategory.toLowerCase();

  // Base operations present for all garments
  const baseOps: OpTemplate[] = [
    {
      code: 'OP_CUTTING', name: 'Cutting', description: 'Cut all pattern pieces per cutting execution plan.',
      time: time(30, 60, 120, ['piece count', 'fabric type', 'directional constraints']),
      deps: [], requiresCustomer: false, skills: ['cutting'],
    },
    {
      code: 'OP_MARKING', name: 'Marking', description: 'Transfer pattern markings, darts, and reference points to fabric.',
      time: time(15, 30, 60, ['piece count', 'detail level']),
      deps: ['OP_CUTTING'], requiresCustomer: false, skills: ['marking'],
    },
  ];

  let garmentOps: OpTemplate[] = [];

  if (['shirt', 'blouse'].includes(cat)) {
    garmentOps = [
      { code: 'OP_FUSING', name: 'Interfacing / Fusing', description: 'Apply interfacing to collar, collar stand, cuffs, and plackets.',
        time: time(15, 25, 45, ['collar type']), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['fusing'] },
      { code: 'OP_COLLAR', name: 'Collar Construction', description: 'Construct collar and collar stand. Press seams.',
        time: time(20, 40, 70, ['collar complexity']), deps: ['OP_FUSING'], requiresCustomer: false, skills: ['collar'] },
      { code: 'OP_SLEEVE', name: 'Sleeve Construction', description: 'Sew sleeve seams, attach cuffs if applicable.',
        time: time(20, 35, 60, ['sleeve type']), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['sleeves'] },
      { code: 'OP_BODY', name: 'Body Assembly', description: 'Join front and back body panels. Sew shoulder and side seams.',
        time: time(25, 45, 90, ['panel count']), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_ATTACH_SLEEVE', name: 'Sleeve Attachment', description: 'Set in sleeves. Ease sleeve cap. Sew sleeve seam.',
        time: time(20, 40, 70, ['sleeve type']), deps: ['OP_BODY', 'OP_SLEEVE'], requiresCustomer: false, skills: ['sleeves', 'assembly'] },
      { code: 'OP_PLACKET', name: 'Button Placket', description: 'Construct and attach button placket. Mark buttonhole positions.',
        time: time(20, 35, 60, ['placket type']), deps: ['OP_ATTACH_SLEEVE'], requiresCustomer: false, skills: ['closures'] },
      { code: 'OP_ATTACH_COLLAR', name: 'Collar Attachment', description: 'Attach completed collar to neckline.',
        time: time(15, 30, 50, ['collar type']), deps: ['OP_PLACKET', 'OP_COLLAR'], requiresCustomer: false, skills: ['collar', 'assembly'] },
      { code: 'OP_HEM', name: 'Hem', description: 'Sew shirt hem. Press.',
        time: time(10, 20, 35, ['hem type']), deps: ['OP_ATTACH_COLLAR'], requiresCustomer: false, skills: ['finishing'] },
      { code: 'OP_BUTTONHOLES', name: 'Buttonholes & Buttons', description: 'Sew buttonholes. Attach buttons.',
        time: time(15, 25, 45, ['button count']), deps: ['OP_HEM'], requiresCustomer: false, skills: ['closures'] },
      { code: 'OP_FITTING', name: 'First Fitting', description: 'Customer fitting. Record fit observations.',
        time: time(20, 30, 60, ['complexity']), deps: ['OP_BODY'], requiresCustomer: true, skills: ['fitting'] },
      { code: 'OP_ADJUSTMENTS', name: 'Adjustments', description: 'Apply fitting alterations. Re-sew adjusted seams.',
        time: time(20, 45, 90, ['alteration scope']), deps: ['OP_FITTING'], requiresCustomer: false, skills: ['alterations'] },
      { code: 'OP_PRESS', name: 'Pressing', description: 'Press all seams and finished garment.',
        time: time(15, 25, 40, ['garment size']), deps: ['OP_ADJUSTMENTS', 'OP_BUTTONHOLES'], requiresCustomer: false, skills: ['pressing'] },
      { code: 'OP_FINAL_QC', name: 'Final Quality Control', description: 'Complete final QC checklist.',
        time: time(10, 20, 35, []), deps: ['OP_PRESS'], requiresCustomer: false, skills: ['quality'] },
    ];
  } else if (cat === 'trouser') {
    garmentOps = [
      { code: 'OP_POCKET', name: 'Pocket Construction', description: 'Sew pocket bags and fronts.',
        time: time(20, 35, 60, ['pocket type']), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['pockets'] },
      { code: 'OP_FLY', name: 'Fly / Zip Construction', description: 'Construct fly shield. Insert zip.',
        time: time(20, 35, 65, ['closure type']), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['closures'] },
      { code: 'OP_LEG', name: 'Leg Assembly', description: 'Sew inseam and outseam of both legs.',
        time: time(20, 35, 60, ['leg complexity']), deps: ['OP_POCKET', 'OP_FLY'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_CROTCH', name: 'Crotch Assembly', description: 'Join legs at crotch. Reinforce crotch seam.',
        time: time(15, 25, 45, []), deps: ['OP_LEG'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_WAISTBAND', name: 'Waistband', description: 'Attach waistband. Insert interlining if required.',
        time: time(20, 35, 60, ['waistband type']), deps: ['OP_CROTCH'], requiresCustomer: false, skills: ['waistband'] },
      { code: 'OP_FITTING', name: 'Fitting', description: 'Customer trouser fitting.',
        time: time(20, 30, 60, []), deps: ['OP_WAISTBAND'], requiresCustomer: true, skills: ['fitting'] },
      { code: 'OP_HEM', name: 'Hem', description: 'Hem trousers to final length.',
        time: time(10, 20, 35, []), deps: ['OP_FITTING'], requiresCustomer: false, skills: ['finishing'] },
      { code: 'OP_PRESS', name: 'Pressing', description: 'Press crease and all seams.',
        time: time(15, 20, 35, []), deps: ['OP_HEM'], requiresCustomer: false, skills: ['pressing'] },
      { code: 'OP_FINAL_QC', name: 'Final Quality Control', description: 'Final QC check.',
        time: time(10, 15, 30, []), deps: ['OP_PRESS'], requiresCustomer: false, skills: ['quality'] },
    ];
  } else if (cat === 'skirt') {
    garmentOps = [
      { code: 'OP_DARTS', name: 'Darts', description: 'Sew and press waist darts.',
        time: time(10, 20, 35, []), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_SIDE_SEAM', name: 'Side Seam Assembly', description: 'Sew side seams. Insert zip if applicable.',
        time: time(15, 25, 45, []), deps: ['OP_DARTS'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_WAISTBAND', name: 'Waistband', description: 'Attach waistband.',
        time: time(15, 30, 50, []), deps: ['OP_SIDE_SEAM'], requiresCustomer: false, skills: ['waistband'] },
      { code: 'OP_FITTING', name: 'Fitting', description: 'Customer skirt fitting.',
        time: time(15, 25, 45, []), deps: ['OP_WAISTBAND'], requiresCustomer: true, skills: ['fitting'] },
      { code: 'OP_HEM', name: 'Hem', description: 'Hem skirt to final length.',
        time: time(10, 20, 35, []), deps: ['OP_FITTING'], requiresCustomer: false, skills: ['finishing'] },
      { code: 'OP_PRESS', name: 'Pressing', description: 'Press all seams.',
        time: time(10, 15, 25, []), deps: ['OP_HEM'], requiresCustomer: false, skills: ['pressing'] },
      { code: 'OP_FINAL_QC', name: 'Final Quality Control', description: 'Final QC.',
        time: time(10, 15, 25, []), deps: ['OP_PRESS'], requiresCustomer: false, skills: ['quality'] },
    ];
  } else if (['kaftan', 'agbada', 'senator'].includes(cat)) {
    garmentOps = [
      { code: 'OP_NECKLINE', name: 'Neckline Construction', description: 'Shape and finish neckline opening.',
        time: time(15, 30, 55, ['neckline type']), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['neckline'] },
      { code: 'OP_SHOULDER', name: 'Shoulder Assembly', description: 'Join shoulder seams.',
        time: time(10, 20, 35, []), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_SLEEVE', name: 'Sleeve / Arm Opening', description: 'Sew sleeve seams or finish arm openings.',
        time: time(15, 30, 55, ['sleeve type']), deps: ['OP_SHOULDER'], requiresCustomer: false, skills: ['sleeves'] },
      { code: 'OP_SIDE_SEAM', name: 'Side Seam Assembly', description: 'Join side seams.',
        time: time(15, 25, 45, []), deps: ['OP_SLEEVE'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_HEM', name: 'Hem', description: 'Hem kaftan to final length.',
        time: time(15, 25, 45, ['hem type']), deps: ['OP_SIDE_SEAM'], requiresCustomer: false, skills: ['finishing'] },
      { code: 'OP_EMBELLISHMENT', name: 'Embellishment / Embroidery', description: 'Apply embellishments, embroidery, or decorative trim if specified.',
        time: time(30, 90, 240, ['complexity']), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['embellishment'] },
      { code: 'OP_FITTING', name: 'Fitting', description: 'Customer fitting.',
        time: time(15, 25, 45, []), deps: ['OP_HEM'], requiresCustomer: true, skills: ['fitting'] },
      { code: 'OP_PRESS', name: 'Pressing', description: 'Press garment.',
        time: time(10, 20, 35, []), deps: ['OP_FITTING'], requiresCustomer: false, skills: ['pressing'] },
      { code: 'OP_FINAL_QC', name: 'Final Quality Control', description: 'Final QC.',
        time: time(10, 20, 35, []), deps: ['OP_PRESS'], requiresCustomer: false, skills: ['quality'] },
    ];
  } else {
    // Generic (dress, gown, bodice, jacket, suit, custom)
    garmentOps = [
      { code: 'OP_FUSING', name: 'Interfacing / Fusing', description: 'Apply interfacing to structured pieces.',
        time: time(15, 30, 60, []), deps: ['OP_MARKING'], requiresCustomer: false, skills: ['fusing'] },
      { code: 'OP_COMPONENT_PREP', name: 'Component Preparation', description: 'Prepare all sub-components before main assembly.',
        time: time(30, 60, 120, ['component count']), deps: ['OP_FUSING'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_ASSEMBLY', name: 'Primary Assembly', description: 'Join main structural panels.',
        time: time(45, 90, 180, ['complexity']), deps: ['OP_COMPONENT_PREP'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_SECONDARY_ASSEMBLY', name: 'Secondary Assembly', description: 'Attach sleeves, collars, waistband, and closures.',
        time: time(30, 60, 120, ['component count']), deps: ['OP_ASSEMBLY'], requiresCustomer: false, skills: ['assembly'] },
      { code: 'OP_FITTING', name: 'First Fitting', description: 'Customer fitting.',
        time: time(20, 35, 60, []), deps: ['OP_ASSEMBLY'], requiresCustomer: true, skills: ['fitting'] },
      { code: 'OP_ADJUSTMENTS', name: 'Adjustments', description: 'Apply alterations from fitting.',
        time: time(20, 50, 120, ['alteration scope']), deps: ['OP_FITTING'], requiresCustomer: false, skills: ['alterations'] },
      { code: 'OP_FINISHING', name: 'Finishing', description: 'Complete hems, closures, loose threads.',
        time: time(20, 40, 80, []), deps: ['OP_ADJUSTMENTS', 'OP_SECONDARY_ASSEMBLY'], requiresCustomer: false, skills: ['finishing'] },
      { code: 'OP_PRESS', name: 'Pressing', description: 'Final press.',
        time: time(15, 25, 45, []), deps: ['OP_FINISHING'], requiresCustomer: false, skills: ['pressing'] },
      { code: 'OP_FINAL_QC', name: 'Final Quality Control', description: 'Final QC checklist.',
        time: time(10, 20, 35, []), deps: ['OP_PRESS'], requiresCustomer: false, skills: ['quality'] },
    ];
  }

  return [...baseOps, ...garmentOps];
}

// ---------------------------------------------------------------------------
// Dependency resolution & cycle detection
// ---------------------------------------------------------------------------

function buildOperations(
  planId: string,
  templates: OpTemplate[],
): ProductionOperation[] {
  const codeToId: Record<string, string> = {};
  const ops: ProductionOperation[] = [];

  // First pass: assign IDs
  for (const t of templates) {
    codeToId[t.code] = generateId();
  }

  // Second pass: build operations with resolved dependency IDs
  let order = 1;
  for (const t of templates) {
    const depIds = t.deps.map((code) => codeToId[code]).filter(Boolean);
    ops.push({
      id: codeToId[t.code],
      productionPlanId: planId,
      code: t.code,
      name: t.name,
      description: t.description,
      order: order++,
      timeEstimate: t.time,
      dependencies: depIds,
      requiredSkills: t.skills,
      requiresCustomer: t.requiresCustomer,
      status: 'not_started',
      blockingReason: null,
      source: 'workflow_rule',
      notes: null,
      startedAt: null,
      completedAt: null,
    });
  }

  return ops;
}

/** Validate DAG: detect cycles using DFS. Returns false if cycle found. */
export function validateNoCycles(operations: ProductionOperation[]): boolean {
  const idToOp = new Map(operations.map((o) => [o.id, o]));
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(id: string): boolean {
    if (inStack.has(id)) return false; // cycle
    if (visited.has(id)) return true;
    visited.add(id);
    inStack.add(id);
    const op = idToOp.get(id);
    if (op) {
      for (const depId of op.dependencies) {
        if (!dfs(depId)) return false;
      }
    }
    inStack.delete(id);
    return true;
  }

  for (const op of operations) {
    if (!dfs(op.id)) return false;
  }
  return true;
}

/** Mark operations as 'ready' when all dependencies are complete. */
export function computeOperationReadiness(
  operations: ProductionOperation[],
): ProductionOperation[] {
  const completedIds = new Set(
    operations.filter((o) => o.status === 'completed' || o.status === 'skipped').map((o) => o.id),
  );

  return operations.map((op) => {
    if (op.status !== 'not_started') return op;
    const allDepsComplete = op.dependencies.every((depId) => completedIds.has(depId));
    if (allDepsComplete) return { ...op, status: 'ready' as ProductionOperationStatus };
    const missing = op.dependencies.filter((d) => !completedIds.has(d));
    const missingOps = operations.filter((o) => missing.includes(o.id)).map((o) => o.name);
    return { ...op, status: 'blocked' as ProductionOperationStatus, blockingReason: `Waiting for: ${missingOps.join(', ')}` };
  });
}

// ---------------------------------------------------------------------------
// Quality Control
// ---------------------------------------------------------------------------

function generateQualityCheckpoints(planId: string, garmentCategory: string): QualityCheckpoint[] {
  const checkpoints: QualityCheckpoint[] = [];
  const qc = (
    phase: QualityCheckpoint['phase'],
    code: string, name: string, description: string, required: boolean,
  ): QualityCheckpoint => ({
    id: qcId(),
    productionPlanId: planId,
    operationId: null,
    phase,
    code,
    name,
    description,
    required,
    status: 'pending',
    failureReason: null,
    notes: null,
    checkedBy: null,
    checkedAt: null,
  });

  // Cutting QC
  checkpoints.push(
    qc('cutting', 'CQC_PIECES', 'Correct pattern pieces', 'All required pattern pieces are cut.', true),
    qc('cutting', 'CQC_QUANTITY', 'Correct quantity', 'Correct number of each piece is cut.', true),
    qc('cutting', 'CQC_GRAIN', 'Grainline orientation', 'All pieces are cut on correct grainline.', true),
    qc('cutting', 'CQC_DIRECTIONAL', 'Directional consistency', 'Directional pieces all face same direction.', false),
    qc('cutting', 'CQC_PATTERN_MATCH', 'Pattern matching reviewed', 'Pattern matching manually verified if required.', false),
    qc('cutting', 'CQC_NOTCHES', 'Notches present', 'All notches and reference marks are present.', true),
    qc('cutting', 'CQC_LABELS', 'Pieces labelled', 'All pieces are labelled with name and quantity.', true),
    qc('cutting', 'CQC_DEFECTS', 'No visible defects', 'Cut fabric pieces are free of visible defects.', true),
  );

  // Assembly QC
  checkpoints.push(
    qc('assembly', 'AQC_SEAM', 'Seam consistency', 'All seam allowances are consistent.', true),
    qc('assembly', 'AQC_TENSION', 'Stitch tension', 'Stitch tension is correct throughout.', true),
    qc('assembly', 'AQC_PUCKER', 'No puckering', 'Seams are smooth without puckering.', true),
    qc('assembly', 'AQC_PRESSING', 'Seams pressed', 'All seams are pressed before next operation.', true),
    qc('assembly', 'AQC_INTEGRITY', 'Structural integrity', 'All structural components securely joined.', true),
  );

  // Fitting QC
  checkpoints.push(
    qc('fitting', 'FQC_COMPLETED', 'Customer fitting completed', 'Customer fitting session completed.', true),
    qc('fitting', 'FQC_OBSERVATIONS', 'Fit observations recorded', 'Fit observations documented.', true),
    qc('fitting', 'FQC_ALTERATIONS', 'Alterations recorded', 'Required alterations recorded.', false),
    qc('fitting', 'FQC_APPROVED', 'Customer approval', 'Customer has approved fit direction.', true),
  );

  // Finishing QC
  checkpoints.push(
    qc('finishing', 'FNQC_CLOSURES', 'Closures functional', 'All buttons, zips, hooks function correctly.', true),
    qc('finishing', 'FNQC_HEMS', 'Hems complete', 'All hems are sewn to specified length.', true),
    qc('finishing', 'FNQC_THREADS', 'Loose threads removed', 'All loose threads are clipped.', true),
  );

  // Final QC
  checkpoints.push(
    qc('final', 'FQC_ALL_OPS', 'All operations complete', 'All required production operations completed.', true),
    qc('final', 'FQC_PRESSED', 'Garment pressed', 'Final garment has been pressed.', true),
    qc('final', 'FQC_VISUAL', 'Visual inspection passed', 'Garment passes visual inspection.', true),
    qc('final', 'FQC_CUSTOMER', 'Customer requirements satisfied', 'All customer requirements addressed.', true),
  );

  return checkpoints;
}

// ---------------------------------------------------------------------------
// Main workflow generator
// ---------------------------------------------------------------------------

export interface WorkflowGenerationResult {
  cuttingExecutionPlan: CuttingExecutionStep[];
  operations: ProductionOperation[];
  qualityCheckpoints: QualityCheckpoint[];
  estimatedTotalTimeMinMinutes: number;
  estimatedTotalTimeExpectedMinutes: number;
  estimatedTotalTimeMaxMinutes: number;
  dependencyGraphValid: boolean;
}

export function generateProductionWorkflow(
  planId: string,
  garmentCategory: string,
  layout: CuttingLayout,
  consumption: FabricConsumption,
): WorkflowGenerationResult {
  // Cutting execution plan
  const cuttingExecutionPlan = generateCuttingExecutionPlan(layout, consumption);

  // Operations
  const templates = getOperationTemplates(garmentCategory);
  const operations = buildOperations(planId, templates);
  const dependencyGraphValid = validateNoCycles(operations);
  const readyOperations = computeOperationReadiness(operations);

  // QC
  const qualityCheckpoints = generateQualityCheckpoints(planId, garmentCategory);

  // Time aggregation
  const totalMin = readyOperations.reduce((s, o) => s + o.timeEstimate.minimumMinutes, 0);
  const totalExpected = readyOperations.reduce((s, o) => s + o.timeEstimate.expectedMinutes, 0);
  const totalMax = readyOperations.reduce((s, o) => s + o.timeEstimate.maximumMinutes, 0);

  return {
    cuttingExecutionPlan,
    operations: readyOperations,
    qualityCheckpoints,
    estimatedTotalTimeMinMinutes: totalMin,
    estimatedTotalTimeExpectedMinutes: totalExpected,
    estimatedTotalTimeMaxMinutes: totalMax,
    dependencyGraphValid,
  };
}

/** Update operation status with transition validation. */
export function transitionOperationStatus(
  op: ProductionOperation,
  newStatus: ProductionOperationStatus,
  allOps: ProductionOperation[],
): { ok: boolean; error?: string; updated: ProductionOperation } {
  const now = new Date().toISOString();

  // Validate allowed transitions
  const allowed: Record<ProductionOperationStatus, ProductionOperationStatus[]> = {
    not_started: ['ready', 'skipped'],
    ready: ['in_progress', 'skipped', 'blocked'],
    in_progress: ['completed', 'blocked'],
    completed: [], // completed is terminal — requires explicit reopen (not in Phase 16)
    blocked: ['ready'],
    skipped: [],
  };

  if (!allowed[op.status]?.includes(newStatus)) {
    return {
      ok: false,
      error: `Cannot transition from ${op.status} to ${newStatus}.`,
      updated: op,
    };
  }

  // Cannot start if dependencies not complete
  if (newStatus === 'in_progress') {
    const completedIds = new Set(
      allOps.filter((o) => o.status === 'completed' || o.status === 'skipped').map((o) => o.id),
    );
    const unmet = op.dependencies.filter((d) => !completedIds.has(d));
    if (unmet.length > 0) {
      const unmetOps = allOps.filter((o) => unmet.includes(o.id)).map((o) => o.name);
      return {
        ok: false,
        error: `Cannot start: ${unmetOps.join(', ')} must be completed first.`,
        updated: op,
      };
    }
  }

  return {
    ok: true,
    updated: {
      ...op,
      status: newStatus,
      startedAt: newStatus === 'in_progress' ? now : op.startedAt,
      completedAt: newStatus === 'completed' ? now : op.completedAt,
    },
  };
}
