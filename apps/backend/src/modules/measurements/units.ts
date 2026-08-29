/**
 * Phase 13 — canonical unit architecture.
 * Canonical unit: cm. Factor: 1 inch = 2.54 cm (exact, deterministic).
 * Precision policy: canonical values are stored at 4 decimal places
 * (NUMERIC(10,4)); display rounding happens only at presentation time and is
 * always derived from the canonical value, so repeated unit toggling can
 * never accumulate drift.
 */
import type { MeasurementUnit } from './types';

export const CANONICAL_UNIT: MeasurementUnit = 'cm';
export const INCH_CM = 2.54;
export const CANONICAL_SCALE = 4;

export function isSupportedUnit(u: unknown): u is MeasurementUnit {
  return u === 'cm' || u === 'inch';
}

/** Round-half-away to canonical scale — used ONLY when persisting canonical. */
export function toCanonicalScale(valueCm: number): number {
  const factor = 10 ** CANONICAL_SCALE;
  return Math.round((valueCm + Number.EPSILON) * factor) / factor;
}

/** Convert an original entry into canonical cm at canonical scale. */
export function toCanonicalCm(originalValue: number, originalUnit: MeasurementUnit): number {
  if (!Number.isFinite(originalValue)) {
    throw new Error('Measurement value must be a finite number');
  }
  if (!isSupportedUnit(originalUnit)) {
    throw new Error(`Unsupported unit: ${String(originalUnit)}`);
  }
  const raw = originalUnit === 'cm' ? originalValue : originalValue * INCH_CM;
  return toCanonicalScale(raw);
}

/** Canonical cm → display unit, full precision (display rounds separately). */
export function fromCanonicalCm(canonicalCm: number, unit: MeasurementUnit): number {
  if (!Number.isFinite(canonicalCm)) {
    throw new Error('Canonical value must be a finite number');
  }
  return unit === 'cm' ? canonicalCm : canonicalCm / INCH_CM;
}

/** Presentation-only rounding (never persisted). */
export function forDisplay(valueInUnit: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round((valueInUnit + Number.EPSILON) * f) / f;
}

/**
 * A conversion is drift-free when re-deriving the original unit from the
 * canonical value reproduces the original entry at canonical scale.
 */
export function roundTripExact(originalValue: number, unit: MeasurementUnit): boolean {
  const canonical = toCanonicalCm(originalValue, unit);
  const back = toCanonicalScale(fromCanonicalCm(canonical, unit));
  return back === toCanonicalScale(originalValue);
}
