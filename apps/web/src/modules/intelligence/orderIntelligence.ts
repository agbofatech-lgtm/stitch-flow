/**
 * Stage 9 contextual intelligence adapter — Phase 18.
 *
 * THIN PASS-THROUGHS OVER EXISTING SERVICES ONLY (§6/CI15 — no duplicate
 * calculation path exists here):
 *   - patternAdapter.mapGarmentCategory + validateMeasurementCompleteness
 *     compute garment→kind mapping and measurement readiness (Phase 14).
 *   - productionAssistant.analyzeDesignInspiration + buildFitRiskWarnings
 *     compute the Phase 17 advisory (local, rule-based — VERIFIED: no
 *     network calls).
 * This module only (a) translates measurement keys, (b) classifies sources,
 * (c) shapes results for presentation. It never recomputes an engine result
 * and contains no mutation path (§18 — advisory can never write).
 *
 * KEY-TRANSLATION PROVENANCE (VERIFIED against patternAdapter.ts,
 * KIND_MEASUREMENT_REQUIREMENTS + MEASUREMENT_CODE_TO_ENGINE_KEY):
 * the completeness engine reads bodies keyed by Phase 13 body codes
 * ('bust_circumference'), while customer profiles and the Stage 8 wizard
 * capture engine keys ('bust'). Note 'bust_circumference' carries the shared
 * label 'Bust / Chest' and is required by bodice (engineKey 'bust') AND
 * shirt/kaftan (engineKey 'chest') — both keys satisfy it here.
 * This table must stay in sync with patternAdapter's; it is translation,
 * not a second measurement model.
 */
import { mapGarmentCategory, validateMeasurementCompleteness } from '../services/patternAdapter';
import { analyzeDesignInspiration, buildFitRiskWarnings } from '../services/productionAssistant';
import type {
  CustomerMeasurementProfile, DesignInspiration, FabricRecord,
  GarmentMeasurements, GarmentType,
} from '../../shared/types';

/** Canonical 16-field capture set — identical keys/order to
 *  OrderForm.SNAPSHOT_FIELDS (src/components/OrderForm.tsx, VERIFIED).
 *  Single source for Stage 8+ code; the legacy form keeps its own copy. */
export const CANONICAL_SNAPSHOT_FIELDS: Array<{ key: keyof GarmentMeasurements; label: string }> = [
  { key: 'bust', label: 'Bust' }, { key: 'chest', label: 'Chest' }, { key: 'waist', label: 'Waist' },
  { key: 'hip', label: 'Hip' }, { key: 'neck', label: 'Neck' }, { key: 'shoulder', label: 'Shoulder' },
  { key: 'sleeve', label: 'Sleeve' }, { key: 'backLength', label: 'Back Length' },
  { key: 'bustSpan', label: 'Bust Span' }, { key: 'armholeDepth', label: 'Armhole Depth' }, { key: 'thigh', label: 'Thigh' },
  { key: 'knee', label: 'Knee' }, { key: 'ankle', label: 'Ankle' },
  { key: 'trouserLength', label: 'Trouser Length' }, { key: 'skirtLength', label: 'Skirt Length' }, { key: 'fullLength', label: 'Full Length' },
];

const CODE_TO_ENGINE_KEYS: Record<string, Array<keyof GarmentMeasurements>> = {
  bust_circumference: ['bust', 'chest'], // 'Bust / Chest' — bodice reads bust; shirt/kaftan read chest
  waist_circumference: ['waist'],
  hip_circumference: ['hip'],
  neck_circumference: ['neck'],
  shoulder_width: ['shoulder'],
  back_length: ['backLength'],
  armhole_depth: ['armholeDepth'],
  sleeve_length: ['sleeve'],
  thigh_circumference: ['thigh'],
  knee_circumference: ['knee'],
  ankle_circumference: ['ankle'],
  inseam_length: ['trouserLength'],
  outseam_length: ['skirtLength'],
};

const cacheKindTotals = new Map<string, { required: number; recommended: number }>();

export interface MeasurementReadiness {
  /** Engine pattern kind this garment maps onto (Phase 14 adapter). */
  kind: string;
  kindLabel: string;
  /** false → engine falls back to a foundation kind; tailor review required. */
  mapped: boolean;
  mappingNote: string | null;
  complete: boolean;
  engineCanRun: boolean;
  requiredTotal: number;
  requiredCaptured: number;
  recommendedTotal: number;
  recommendedCaptured: number;
  requiredMissing: Array<{ code: string; label: string }>;
  recommendedMissing: Array<{ code: string; label: string }>;
}

/** Deterministic readiness (Phase 14 adapter). Pure; memoize at call sites. */
type NumericMeasurements = Partial<Record<keyof GarmentMeasurements, number>>;

export function measurementReadiness(
  garment: GarmentType,
  measurements: NumericMeasurements | null | undefined,
): MeasurementReadiness {
  const { kind, mapped, warning } = mapGarmentCategory(garment);

  // Translate engine keys → Phase 13 body codes for the real validator:
  const body: Record<string, number> = {};
  for (const [code, keys] of Object.entries(CODE_TO_ENGINE_KEYS)) {
    for (const k of keys) {
      const v = measurements?.[k];
      if (typeof v === 'number' && !Number.isNaN(v)) { body[code] = v; break; }
    }
  }
  const result = validateMeasurementCompleteness(kind, body);
  // Totals via the engine itself (empty body = every requirement reported missing):
  let totals = cacheKindTotals.get(kind);
  if (!totals) {
    const all = validateMeasurementCompleteness(kind, {});
    totals = {
      required: all.missing.filter((m) => m.severity === 'required').length,
      recommended: all.missing.filter((m) => m.severity !== 'required').length,
    };
    cacheKindTotals.set(kind, totals);
  }
  const requiredMissing = result.missing.filter((m) => m.severity === 'required').map(({ code, label }) => ({ code, label }));
  const recommendedMissing = result.missing.filter((m) => m.severity !== 'required').map(({ code, label }) => ({ code, label }));
  return {
    kind,
    kindLabel: kind.charAt(0).toUpperCase() + kind.slice(1),
    mapped,
    mappingNote: warning ?? null,
    complete: result.complete,
    engineCanRun: result.engineCanRun,
    requiredTotal: totals.required,
    requiredCaptured: totals.required - requiredMissing.length,
    recommendedTotal: totals.recommended,
    recommendedCaptured: totals.recommended - recommendedMissing.length,
    requiredMissing,
    recommendedMissing,
  };
}

export interface FitRiskAdvisory {
  warnings: Array<{ severity: string; title: string; description: string; recommendation?: string }>;
}

/** Phase 17 advisory (local, rule-based). Pure; ADVISORY class — never a
 *  mutation path. `inspiration` may be null (order without a design yet). */
export function fitRiskAdvisory(
  garment: GarmentType | null,
  measurements: NumericMeasurements | null | undefined,
  inspiration: DesignInspiration | null,
): FitRiskAdvisory {
  if (!garment) return { warnings: [] };
  const analysis = analyzeDesignInspiration(inspiration ?? undefined, garment);
  const warnings = buildFitRiskWarnings({
    garmentType: garment,
    measurements: (measurements ?? null) as Partial<GarmentMeasurements> | null,
    analysis,
  });
  return { warnings };
}

export type FabricRequirementStatus =
  | { state: 'no_fabric' }
  | { state: 'width_unknown'; fabric: FabricRecord };

/** FabricRecord carries NO width/composition/weight (VERIFIED shared/types) —
 *  the Phase 15→16 consumption chain cannot finalize from the library record
 *  alone. Honest degradation (§21); never a fabricated estimate. */
export function fabricRequirementStatus(fabric: FabricRecord | null | undefined): FabricRequirementStatus {
  if (!fabric) return { state: 'no_fabric' };
  return { state: 'width_unknown', fabric };
}

/** Steps of the canonical Phase 16 consumption pipeline, by name only —
 *  names VERIFIED from fabricConsumptionService's documented L0→L6 chain.
 *  Values are computed by that service during cutting preparation, never here. */
export const CONSUMPTION_CHAIN_STEPS: readonly string[] = [
  'Cutting layout length (Phase 15 geometry)',
  'Shrinkage allowance',
  'Selvedge / usable-width adjustment',
  'Pattern-matching allowance',
  'Directional (nap) allowance',
  'Handling waste',
  'Safety buffer',
];

/** §25 snapshot integrity: which canonical fields differ between an order's
 *  frozen snapshot and the customer's CURRENT profile. Pure comparison. */
export function snapshotDrift(
  snapshot: Partial<Record<keyof GarmentMeasurements, number>> | null | undefined,
  currentProfile: CustomerMeasurementProfile | null | undefined,
): { drift: boolean; changedFields: Array<{ label: string; from: number | undefined; to: number | undefined }> } {
  if (!currentProfile) return { drift: false, changedFields: [] };
  const changedFields: Array<{ label: string; from: number | undefined; to: number | undefined }> = [];
  for (const { key, label } of CANONICAL_SNAPSHOT_FIELDS) {
    const then = snapshot?.[key];
    const now = (currentProfile.measurements as NumericMeasurements | undefined)?.[key];
    if (then !== now) changedFields.push({ label, from: then, to: now });
  }
  return { drift: changedFields.length > 0, changedFields };
}
