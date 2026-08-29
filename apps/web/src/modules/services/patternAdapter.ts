/**
 * Phase 15 — Pattern Adapter.
 *
 * External wrapper around patternEngine.ts — the engine is NEVER modified.
 * This adapter:
 *   1. Maps Phase 14 DesignSpecification → patternEngine inputs
 *   2. Maps garment categories → StylePatternKind
 *   3. Applies ease configurations explicitly (pre-engine, traceable)
 *   4. Validates measurement completeness — never silently uses engine defaults
 *   5. Calls patternEngine.generateStylePattern() as the single engine entry point
 *   6. Returns the engine result plus full derivation context
 *
 * CONSTRAINTS:
 * - patternEngine.ts ZERO DIFF — import only, never modify
 * - Measurement defaults never silently applied — always flagged for tailor
 * - Ease application is explicit and traceable per area
 * - Pattern matching geometry never faked — flagged for manual verification
 */

import {
  generateStylePattern,
  type StylePatternKind,
  type StylePatternResult,
  type ExtendedMeasurements,
  type GenericPatternDraft,
} from './patternEngine';
import type { DesignSpecification } from '../../shared/api/design';
import type {
  AppliedEase,
  EaseArea,
  EaseSource,
  MeasurementCompletenessResult,
  MissingMeasurement,
  PatternDerivationContext,
} from '../../shared/api/pattern';

// ---------------------------------------------------------------------------
// Garment category → StylePatternKind mapping
// ---------------------------------------------------------------------------

const GARMENT_KIND_MAP: Record<string, StylePatternKind> = {
  shirt: 'shirt',
  blouse: 'shirt',
  trousers: 'trouser',
  skirt: 'skirt',
  kaftan: 'kaftan',
  agbada: 'kaftan',   // outer agbada body uses kaftan foundation
  dress: 'bodice',
  gown: 'bodice',
  jacket: 'bodice',
  suit: 'bodice',
  traditional: 'kaftan',
  custom: 'bodice',   // conservative fallback
};

/** Map a Phase 14 garment category to a StylePatternKind the engine accepts. */
export function mapGarmentCategory(category: string): {
  kind: StylePatternKind;
  mapped: boolean;
  warning?: string;
} {
  const kind = GARMENT_KIND_MAP[category.toLowerCase()];
  if (kind) return { kind, mapped: true };
  // Unknown category — fall back to bodice, flag warning
  return {
    kind: 'bodice',
    mapped: false,
    warning: `Garment category '${category}' is not directly supported by the pattern engine. Using 'bodice' foundation — tailor review required.`,
  };
}

// ---------------------------------------------------------------------------
// Measurement completeness validation
// ---------------------------------------------------------------------------

/**
 * Engine measurement key requirements per kind.
 * required: engine will throw PatternValidationError without these
 * recommended: engine silently uses defaults without these
 */
const KIND_MEASUREMENT_REQUIREMENTS: Record<
  StylePatternKind,
  {
    required: Array<{ code: string; engineKey: string; label: string; defaultCm: number }>;
    recommended: Array<{ code: string; engineKey: string; label: string; defaultCm: number }>;
  }
> = {
  bodice: {
    required: [
      { code: 'bust_circumference', engineKey: 'bust', label: 'Bust / Chest', defaultCm: 90 },
      { code: 'waist_circumference', engineKey: 'waist', label: 'Waist', defaultCm: 72 },
      { code: 'neck_circumference', engineKey: 'neck', label: 'Neck', defaultCm: 36 },
      { code: 'shoulder_width', engineKey: 'shoulder', label: 'Shoulder Width', defaultCm: 12 },
      { code: 'back_length', engineKey: 'backLength', label: 'Back Length', defaultCm: 40 },
    ],
    recommended: [
      { code: 'armhole_depth', engineKey: 'armholeDepth', label: 'Armhole Depth', defaultCm: 22 },
    ],
  },
  shirt: {
    required: [
      { code: 'bust_circumference', engineKey: 'chest', label: 'Bust / Chest', defaultCm: 96 },
      { code: 'neck_circumference', engineKey: 'neck', label: 'Neck', defaultCm: 36 },
      { code: 'shoulder_width', engineKey: 'shoulder', label: 'Shoulder Width', defaultCm: 12 },
      { code: 'back_length', engineKey: 'backLength', label: 'Back Length', defaultCm: 40 },
    ],
    recommended: [
      { code: 'sleeve_length', engineKey: 'sleeve', label: 'Sleeve Length', defaultCm: 24 },
    ],
  },
  trouser: {
    required: [
      { code: 'waist_circumference', engineKey: 'waist', label: 'Waist', defaultCm: 72 },
      { code: 'hip_circumference', engineKey: 'hip', label: 'Hip', defaultCm: 98 },
    ],
    recommended: [
      { code: 'thigh_circumference', engineKey: 'thigh', label: 'Thigh', defaultCm: 58 },
      { code: 'inseam_length', engineKey: 'trouserLength', label: 'Trouser Length', defaultCm: 108 },
    ],
  },
  skirt: {
    required: [
      { code: 'waist_circumference', engineKey: 'waist', label: 'Waist', defaultCm: 72 },
    ],
    recommended: [
      { code: 'hip_circumference', engineKey: 'hip', label: 'Hip', defaultCm: 98 },
      { code: 'outseam_length', engineKey: 'skirtLength', label: 'Skirt Length', defaultCm: 75 },
    ],
  },
  kaftan: {
    required: [
      { code: 'bust_circumference', engineKey: 'chest', label: 'Bust / Chest', defaultCm: 96 },
      { code: 'shoulder_width', engineKey: 'shoulder', label: 'Shoulder Width', defaultCm: 12 },
      { code: 'back_length', engineKey: 'backLength', label: 'Back Length', defaultCm: 40 },
    ],
    recommended: [
      { code: 'neck_circumference', engineKey: 'neck', label: 'Neck', defaultCm: 36 },
    ],
  },
};

/**
 * Phase 13 measurement code → engine measurement key mapping.
 * Body measurement codes from definitions.ts → ExtendedMeasurements keys.
 */
const MEASUREMENT_CODE_TO_ENGINE_KEY: Record<string, keyof ExtendedMeasurements> = {
  bust_circumference: 'bust',
  waist_circumference: 'waist',
  hip_circumference: 'hip',
  neck_circumference: 'neck',
  shoulder_width: 'shoulder',
  back_length: 'backLength',
  front_length: 'backLength',  // fallback mapping
  sleeve_length: 'sleeve',
  armhole_depth: 'armholeDepth',
  thigh_circumference: 'thigh',
  ankle_circumference: 'ankle',
  inseam_length: 'trouserLength',
  outseam_length: 'skirtLength',
  bicep_circumference: 'chest',  // bicep → chest context (engine doesn't have direct bicep)
};

/** Validate measurement completeness for a given engine kind. */
export function validateMeasurementCompleteness(
  kind: StylePatternKind,
  measurementBody: Record<string, number>,
  measurementGarment?: Record<string, number>,
): MeasurementCompletenessResult {
  const reqs = KIND_MEASUREMENT_REQUIREMENTS[kind];
  const missing: MissingMeasurement[] = [];
  const outOfRangeCodes: string[] = [];

  // Check required measurements
  for (const req of reqs.required) {
    const val = measurementBody[req.code] ?? measurementGarment?.[req.code];
    if (val === undefined || val === null || Number.isNaN(val)) {
      missing.push({
        code: req.code,
        label: req.label,
        severity: 'required',
        engineDefaultCm: req.defaultCm,
        hint: `${req.label} is required to derive a ${kind} pattern. Engine default: ${req.defaultCm} cm — use [Use Estimate] or [Enter Manually].`,
      });
    }
  }

  // Check recommended measurements
  for (const rec of reqs.recommended) {
    const val = measurementBody[rec.code] ?? measurementGarment?.[rec.code];
    if (val === undefined || val === null || Number.isNaN(val)) {
      missing.push({
        code: rec.code,
        label: rec.label,
        severity: 'recommended',
        engineDefaultCm: rec.defaultCm,
        hint: `${rec.label} is recommended for accurate ${kind} pattern. Engine default: ${rec.defaultCm} cm — use [Use Estimate] or [Enter Manually].`,
      });
    }
  }

  const complete = missing.filter((m) => m.severity === 'required').length === 0;
  // Engine can always run (it has defaults), but we flag it as requiring tailor decision
  const engineCanRun = true;

  return {
    complete,
    missing,
    outOfRangeCodes,
    engineCanRun,
  };
}

// ---------------------------------------------------------------------------
// Ease application
// ---------------------------------------------------------------------------

const FIT_TYPE_EASE_MAP: Record<string, Array<{ area: EaseArea; valueCm: number }>> = {
  fitted:    [{ area: 'chest', valueCm: 2 }, { area: 'waist', valueCm: 1 }, { area: 'hip', valueCm: 2 }],
  slim:      [{ area: 'chest', valueCm: 3 }, { area: 'waist', valueCm: 2 }, { area: 'hip', valueCm: 3 }],
  regular:   [{ area: 'chest', valueCm: 5 }, { area: 'waist', valueCm: 3 }, { area: 'hip', valueCm: 5 }],
  relaxed:   [{ area: 'chest', valueCm: 8 }, { area: 'waist', valueCm: 5 }, { area: 'hip', valueCm: 7 }],
  loose:     [{ area: 'chest', valueCm: 12 }, { area: 'waist', valueCm: 8 }, { area: 'hip', valueCm: 10 }],
  oversized: [{ area: 'chest', valueCm: 18 }, { area: 'waist', valueCm: 14 }, { area: 'hip', valueCm: 16 }],
  custom:    [],
};

const GARMENT_TYPE_BASE_EASE: Record<string, Array<{ area: EaseArea; valueCm: number }>> = {
  shirt:   [{ area: 'chest', valueCm: 5 }, { area: 'waist', valueCm: 3 }],
  trouser: [{ area: 'hip', valueCm: 4 }, { area: 'waist', valueCm: 3 }],
  skirt:   [{ area: 'hip', valueCm: 4 }, { area: 'waist', valueCm: 2 }],
  kaftan:  [{ area: 'chest', valueCm: 10 }, { area: 'hip', valueCm: 8 }],
  bodice:  [{ area: 'chest', valueCm: 4 }, { area: 'waist', valueCm: 2 }],
};

/**
 * Build the final list of AppliedEase entries.
 * Priority: design_spec explicit > fit_type > garment_type_default
 * Returns explicit, traceable ease per area.
 */
export function buildAppliedEase(
  spec: DesignSpecification,
  engineKind: StylePatternKind,
): AppliedEase[] {
  const applied: AppliedEase[] = [];
  const areaUsed = new Set<EaseArea>();

  // 1. Design spec explicit ease configurations (highest priority)
  for (const ec of spec.easeConfigurations ?? []) {
    const area = ec.area as EaseArea;
    applied.push({
      area,
      valueCm: ec.valueCm,
      source: (ec.source === 'tailor_override' ? 'tailor_override' : 'design_spec') as EaseSource,
      fromDesignSpecId: spec.id,
    });
    areaUsed.add(area);
  }

  // 2. Fit type ease (if not already set by design spec)
  const fitType = spec.garment?.fit ?? 'regular';
  const fitEase = FIT_TYPE_EASE_MAP[fitType] ?? FIT_TYPE_EASE_MAP['regular'];
  for (const fe of fitEase) {
    if (!areaUsed.has(fe.area)) {
      applied.push({
        area: fe.area,
        valueCm: fe.valueCm,
        source: 'fit_type',
        fromDesignSpecId: spec.id,
      });
      areaUsed.add(fe.area);
    }
  }

  // 3. Garment type base ease (if not already set)
  const baseEase = GARMENT_TYPE_BASE_EASE[engineKind] ?? [];
  for (const be of baseEase) {
    if (!areaUsed.has(be.area)) {
      applied.push({
        area: be.area,
        valueCm: be.valueCm,
        source: 'garment_type_default',
        fromDesignSpecId: null,
      });
      areaUsed.add(be.area);
    }
  }

  return applied;
}

// ---------------------------------------------------------------------------
// Measurement → ExtendedMeasurements mapping + ease application
// ---------------------------------------------------------------------------

function r1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Build the ExtendedMeasurements object to pass to the pattern engine.
 * Applies ease to body measurements before calling the engine.
 * Only uses accepted defaults (tailor-confirmed) — never silently.
 */
export function buildEngineMeasurements(
  body: Record<string, number>,
  garment: Record<string, number> | undefined,
  ease: AppliedEase[],
  defaultsAccepted: Array<{ code: string; defaultCm: number }>,
  tailorOverrides: Array<{ code: string; valueCm: number }>,
): {
  measurements: ExtendedMeasurements;
  measurementsUsed: Record<string, number>;
} {
  const measurementsUsed: Record<string, number> = {};

  // Build ease lookup by area
  const easeByArea = new Map<string, number>();
  for (const e of ease) easeByArea.set(e.area, e.valueCm);

  // Helper: get measurement value (tailor override > body > garment > accepted default)
  function getMeasurement(
    bodyCode: string,
    engineKey: string,
    easeArea?: EaseArea,
  ): number | undefined {
    // Check tailor override first
    const override = tailorOverrides.find((o) => o.code === bodyCode);
    if (override) {
      const val = r1(override.valueCm + (easeArea ? (easeByArea.get(easeArea) ?? 0) : 0));
      measurementsUsed[engineKey] = val;
      return val;
    }

    // Body measurement
    let val: number | undefined = body[bodyCode];
    if (val === undefined) {
      // Try garment measurement
      val = garment?.[bodyCode];
    }
    if (val !== undefined && !Number.isNaN(val)) {
      const withEase = r1(val + (easeArea ? (easeByArea.get(easeArea) ?? 0) : 0));
      measurementsUsed[engineKey] = withEase;
      return withEase;
    }

    // Accepted default
    const def = defaultsAccepted.find((d) => d.code === bodyCode);
    if (def) {
      const withEase = r1(def.defaultCm + (easeArea ? (easeByArea.get(easeArea) ?? 0) : 0));
      measurementsUsed[engineKey] = withEase;
      return withEase;
    }

    return undefined;
  }

  const bust = getMeasurement('bust_circumference', 'bust', 'chest');
  const waist = getMeasurement('waist_circumference', 'waist', 'waist');
  const hip = getMeasurement('hip_circumference', 'hip', 'hip');
  const neck = getMeasurement('neck_circumference', 'neck');
  const shoulder = getMeasurement('shoulder_width', 'shoulder');
  const backLength = getMeasurement('back_length', 'backLength');
  const sleeve = getMeasurement('sleeve_length', 'sleeve');
  const armholeDepth = getMeasurement('armhole_depth', 'armholeDepth');
  const thigh = getMeasurement('thigh_circumference', 'thigh');
  const ankle = getMeasurement('ankle_circumference', 'ankle');
  const trouserLength = getMeasurement('inseam_length', 'trouserLength');
  const skirtLength = getMeasurement('outseam_length', 'skirtLength');

  const measurements: ExtendedMeasurements = {};
  if (bust !== undefined) measurements.bust = bust;
  if (waist !== undefined) measurements.waist = waist;
  if (hip !== undefined) measurements.hip = hip;
  if (neck !== undefined) measurements.neck = neck;
  if (shoulder !== undefined) measurements.shoulder = shoulder;
  if (backLength !== undefined) measurements.backLength = backLength;
  if (sleeve !== undefined) measurements.sleeve = sleeve;
  if (armholeDepth !== undefined) measurements.armholeDepth = armholeDepth;
  if (thigh !== undefined) measurements.thigh = thigh;
  if (ankle !== undefined) measurements.ankle = ankle;
  if (trouserLength !== undefined) measurements.trouserLength = trouserLength;
  if (skirtLength !== undefined) measurements.skirtLength = skirtLength;
  // chest mirrors bust for shirt/kaftan engine paths
  if (bust !== undefined) measurements.chest = bust;

  return { measurements, measurementsUsed };
}

// ---------------------------------------------------------------------------
// Adapter result
// ---------------------------------------------------------------------------

export interface PatternAdapterResult {
  engineResult: StylePatternResult;
  derivationContext: PatternDerivationContext;
  measurementCompleteness: MeasurementCompletenessResult;
  warnings: string[];
}

/**
 * Main entry point for Pattern Intelligence.
 * Wraps patternEngine.ts without modifying it.
 */
export function runPatternAdapter(
  spec: DesignSpecification,
  options: {
    defaultsAccepted?: Array<{ code: string; defaultCm: number }>;
    tailorOverrides?: Array<{ code: string; valueCm: number }>;
    notes?: string;
  } = {},
): PatternAdapterResult {
  const warnings: string[] = [];
  const defaultsAccepted = options.defaultsAccepted ?? [];
  const tailorOverrides = options.tailorOverrides ?? [];

  // 1. Map garment category → engine kind
  const { kind, mapped, warning: kindWarning } = mapGarmentCategory(spec.garment.category);
  if (kindWarning) warnings.push(kindWarning);
  if (!mapped) {
    warnings.push(`Category '${spec.garment.category}' not directly supported. Pattern will be a ${kind} foundation — tailor verification required.`);
  }

  // 2. Extract measurements from design spec context
  const body = spec.measurementContext?.body ?? {};
  const garment = spec.measurementContext?.garment;

  // 3. Validate completeness (never silent)
  const measurementCompleteness = validateMeasurementCompleteness(kind, body, garment);

  // Warn about missing required measurements if they don't have accepted defaults
  for (const missing of measurementCompleteness.missing) {
    const hasDefault = defaultsAccepted.some((d) => d.code === missing.code);
    const hasOverride = tailorOverrides.some((o) => o.code === missing.code);
    if (!hasDefault && !hasOverride) {
      warnings.push(`Measurement '${missing.label}' is ${missing.severity} — ${missing.hint}`);
    }
  }

  // 4. Build applied ease
  const easeApplied = buildAppliedEase(spec, kind);

  // 5. Build engine measurements
  const { measurements, measurementsUsed } = buildEngineMeasurements(
    body,
    garment,
    easeApplied,
    defaultsAccepted,
    tailorOverrides,
  );

  // 6. Apply length override from spec if present
  if (spec.garment.targetLengthCm && spec.garment.targetLengthCm > 0) {
    if (kind === 'skirt') {
      measurements.skirtLength = spec.garment.targetLengthCm;
      measurementsUsed['skirtLength'] = spec.garment.targetLengthCm;
    } else if (kind === 'trouser') {
      measurements.trouserLength = spec.garment.targetLengthCm;
      measurementsUsed['trouserLength'] = spec.garment.targetLengthCm;
    }
    // For bodice/shirt/kaftan the backLength drives total length
  }

  // 7. Apply sleeve length override from spec
  if (spec.sleeves?.targetLengthCm && spec.sleeves.targetLengthCm > 0) {
    measurements.sleeve = spec.sleeves.targetLengthCm;
    measurementsUsed['sleeve'] = spec.sleeves.targetLengthCm;
  }

  // 8. Call the engine (ZERO DIFF — external call only)
  const engineResult = generateStylePattern(kind, measurements);

  // 9. Build traceability context
  const derivationContext: PatternDerivationContext = {
    designSpecId: spec.id,
    measurementProfileId: spec.measurementProfileId ?? '',
    measurementProfileVersion: spec.measurementContext
      ? (spec.measurementContext as unknown as { profileVersion?: number }).profileVersion ?? 1
      : 1,
    engineKind: kind,
    garmentCategory: spec.garment.category,
    measurementsUsed,
    easeApplied,
    defaultsAccepted,
    tailorOverrides,
    warnings: [...warnings],
  };

  return {
    engineResult,
    derivationContext,
    measurementCompleteness,
    warnings,
  };
}

/** Check if an engine result is a GenericPatternDraft (not a bodice). */
export function isGenericDraft(result: StylePatternResult): result is GenericPatternDraft {
  return 'pieceNotes' in result;
}
