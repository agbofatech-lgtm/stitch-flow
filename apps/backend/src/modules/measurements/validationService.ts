/**
 * Phase 13 — deterministic measurement intelligence.
 * Three layers: L1 hard data validation (may block), L2 relational sanity
 * (warnings only), L3 historical anomaly detection (flags, never silent
 * mutation). Completeness is definition-driven. Suggestions are historical
 * only — never predictive.
 */
import type {
  AnomalyFinding,
  CompletenessResult,
  MeasurementDefinition,
  MeasurementValue,
  RelationalFinding,
  ValidationResult,
} from './types';
import { requiredDefinitionsFor, DEFINITION_BY_CODE } from './definitions';
import { isSupportedUnit, toCanonicalCm } from './units';

export interface ValueInput {
  definitionCode: string;
  originalValue: unknown;
  originalUnit: unknown;
  source?: string;
  confidence?: string;
  notes?: string;
  overrideReason?: string | null;
}

const PHASE13_SOURCES = new Set(['manual', 'historical_copy', 'imported', 'derived', 'estimated']);

/** LEVEL 1 — hard validation of raw inputs. Errors block saving. */
export function validateLevel1(inputs: ValueInput[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const v of inputs) {
    const def = DEFINITION_BY_CODE.get(v.definitionCode);
    if (!def) {
      errors.push(`Unknown measurement definition code: ${v.definitionCode}`);
      continue;
    }
    if (seen.has(v.definitionCode)) {
      errors.push(`Duplicate measurement definition in set: ${v.definitionCode}`);
    }
    seen.add(v.definitionCode);
    const num = typeof v.originalValue === 'number' ? v.originalValue : Number(v.originalValue);
    if (!Number.isFinite(num)) {
      errors.push(`${v.definitionCode}: value must be numeric`);
      continue;
    }
    if (num <= 0) {
      errors.push(`${v.definitionCode}: value must be positive`);
    }
    if (!isSupportedUnit(v.originalUnit)) {
      errors.push(`${v.definitionCode}: unsupported unit '${String(v.originalUnit)}'`);
      continue;
    }
    try {
      toCanonicalCm(num, v.originalUnit);
    } catch {
      errors.push(`${v.definitionCode}: canonical conversion failed`);
    }
    if (v.source && !PHASE13_SOURCES.has(v.source)) {
      errors.push(`${v.definitionCode}: source '${v.source}' is reserved for future phases`);
    }
  }
  return errors;
}

/** LEVEL 2 — relational sanity. Warnings never reject. */
export function runRelationalChecks(values: MeasurementValue[]): RelationalFinding[] {
  const byCode = new Map(values.map((v) => [v.definitionCode, v]));
  const findings: RelationalFinding[] = [];
  const pair = (
    smaller: string,
    larger: string,
    message: string,
  ): void => {
    const a = byCode.get(smaller);
    const b = byCode.get(larger);
    if (!a || !b) return;
    const ok = Number(a.canonicalValueCm) <= Number(b.canonicalValueCm);
    findings.push({
      code: `${smaller}<=${larger}`,
      result: ok ? 'OK' : 'WARNING',
      message: ok ? '' : message,
      compared: [
        { code: smaller, canonicalValueCm: Number(a.canonicalValueCm) },
        { code: larger, canonicalValueCm: Number(b.canonicalValueCm) },
      ],
    });
  };
  pair('inseam_length', 'outseam_length', 'Outseam is usually greater than inseam — review the entries.');
  pair('garment_inseam_length', 'garment_outseam_length', 'Garment outseam is usually greater than inseam — review the entries.');
  pair('calf_circumference', 'thigh_circumference', 'Calf larger than thigh is unusual — review the entries.');
  pair('neck_circumference', 'bust_circumference', 'Neck larger than chest is unusual — review the entries.');
  return findings;
}

/** LEVEL 3 — historical anomaly detection against the customer's own history. */
export function runHistoricalChecks(
  current: MeasurementValue[],
  previousByCode: Map<string, number>,
  averageByCode: Map<string, number>,
): AnomalyFinding[] {
  const out: AnomalyFinding[] = [];
  for (const v of current) {
    const cur = Number(v.canonicalValueCm);
    const prev = previousByCode.get(v.definitionCode) ?? null;
    const avg = averageByCode.get(v.definitionCode) ?? null;
    const changeVsPrev = prev ? ((cur - prev) / prev) * 100 : null;
    const changeVsAvg = avg ? ((cur - avg) / avg) * 100 : null;
    let state: AnomalyFinding['state'] = 'NORMAL';
    const reasons: string[] = [];
    if (changeVsPrev !== null && Math.abs(changeVsPrev) > 5) {
      state = 'UNUSUAL';
      reasons.push(`${Math.abs(changeVsPrev).toFixed(1)}% different from the previous profile`);
    }
    if (changeVsAvg !== null && Math.abs(changeVsAvg) > 10) {
      state = 'FLAGGED';
      reasons.push(`${Math.abs(changeVsAvg).toFixed(1)}% away from this customer's historical average`);
    }
    if (state !== 'NORMAL' || prev !== null) {
      out.push({
        definitionCode: v.definitionCode,
        state,
        currentCm: cur,
        previousCm: prev,
        historicalAverageCm: avg,
        changePercent: changeVsPrev,
        explanation:
          state === 'NORMAL'
            ? 'Within this customer’s historical range.'
            : `Historical change detected: ${reasons.join('; ')}. This is informational — bodies change; verify the tape, then keep or override.`,
      });
    }
  }
  return out;
}

/** Completeness — requiredness comes from the definition registry. */
export function runCompleteness(
  presentCodes: Set<string>,
  garmentType: string | 'body',
): CompletenessResult {
  const required = requiredDefinitionsFor(garmentType);
  const missing = required.filter((d) => !presentCodes.has(d.code)).map((d) => d.code);
  const present = required.filter((d) => presentCodes.has(d.code)).map((d) => d.code);
  return {
    garmentType,
    missingDefinitions: missing,
    presentDefinitions: present,
    state: missing.length === 0 ? 'COMPLETE' : 'PARTIAL',
  };
}

export function assembleValidation(opts: {
  level1Errors: string[];
  relational: RelationalFinding[];
  anomalies: AnomalyFinding[];
  completeness: CompletenessResult[];
}): ValidationResult {
  const complete = opts.completeness.every((c) => c.state === 'COMPLETE');
  return {
    level1: { result: opts.level1Errors.length === 0 ? 'PASS' : 'FAIL', errors: opts.level1Errors },
    relational: opts.relational,
    anomalies: opts.anomalies,
    completeness: opts.completeness.map((c) => ({
      ...c,
      state: c.state === 'COMPLETE' && opts.level1Errors.length === 0 ? 'READY_FOR_DESIGN' : c.state,
    })),
    canSave: opts.level1Errors.length === 0,
    canValidate: opts.level1Errors.length === 0 && complete,
  };
}

/** Historical suggestions only — previous verified values, never predictions. */
export function historicalSuggestions(
  missingCodes: string[],
  previousVerified: Map<string, { canonicalValueCm: number; confidence: string }>,
): { definitionCode: string; label: string; previousCm: number }[] {
  return missingCodes
    .map((code) => {
      const prev = previousVerified.get(code);
      const def: MeasurementDefinition | undefined = DEFINITION_BY_CODE.get(code);
      if (!prev || prev.confidence !== 'verified' || !def) return null;
      return { definitionCode: code, label: def.label, previousCm: prev.canonicalValueCm };
    })
    .filter((x): x is { definitionCode: string; label: string; previousCm: number } => x !== null);
}
