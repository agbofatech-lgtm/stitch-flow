/**
 * T8 length units. Pattern Engine remains centimetres (ADR-001).
 * Conversion happens in front of the engine — never inside it.
 */

export type LengthUnit = 'cm' | 'in';

/** Canonical unit consumed by the protected Pattern Engine. */
export const ENGINE_LENGTH_UNIT: LengthUnit = 'cm';

/** International inch. Named constant — not an unexplained magic number. */
export const CM_PER_INCH = 2.54;

export function assertLengthUnit(unit: string): asserts unit is LengthUnit {
  if (unit === 'cm' || unit === 'in') return;
  throw new Error(`STOP: unknown length unit "${unit}". Do not guess.`);
}

export function toCentimetres(value: number, unit: LengthUnit): number {
  if (!Number.isFinite(value)) {
    throw new Error('STOP: measurement value is not finite');
  }
  assertLengthUnit(unit);
  if (unit === 'cm') return value;
  return value * CM_PER_INCH;
}

export function fromCentimetres(cm: number, unit: LengthUnit): number {
  if (!Number.isFinite(cm)) {
    throw new Error('STOP: measurement value is not finite');
  }
  assertLengthUnit(unit);
  if (unit === 'cm') return cm;
  return cm / CM_PER_INCH;
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  return fromCentimetres(toCentimetres(value, from), to);
}

export function convertFieldMap(
  fields: Record<string, number>,
  from: LengthUnit,
  to: LengthUnit
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(fields)) {
    next[key] = convertLength(value, from, to);
  }
  return next;
}
