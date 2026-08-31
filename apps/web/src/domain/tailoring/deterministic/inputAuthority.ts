/**
 * T10.3 governed input. No silent coercion. No UI objects as authority.
 * Does not fill conflicting hip/bust defaults.
 */

import { classifyMeasurementField } from '../../measurement/fields';
import { assertLengthUnit, type LengthUnit } from '../../measurement/units';
import type { StylePatternKind } from '../../../modules/services/patternEngine';
import { refuseImplicitBodyToFabricConversion } from './units';

export const PATTERN_KINDS: StylePatternKind[] = [
  'bodice',
  'shirt',
  'trouser',
  'skirt',
  'kaftan',
];

/** Fields the engine will read for a kind. Missing keys stay missing (engine defaults apply). */
export const PATTERN_DECLARED_FIELDS: Record<StylePatternKind, string[]> = {
  bodice: ['bust', 'waist', 'neck', 'shoulder', 'backLength', 'bustSpan', 'armholeDepth'],
  shirt: ['chest', 'bust', 'neck', 'shoulder', 'sleeve', 'backLength'],
  trouser: ['waist', 'hip', 'trouserLength', 'thigh', 'knee', 'ankle'],
  skirt: ['waist', 'hip', 'skirtLength'],
  kaftan: ['chest', 'bust', 'shoulder', 'backLength', 'neck'],
};

export type GovernedMeasurementMap = Record<string, number>;

export function assertNoSilentCoercion(value: unknown, field: string): number {
  if (typeof value === 'string') {
    throw new Error(`STOP: measurement "${field}" is a string; refuse silent numeric coercion`);
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`STOP: measurement "${field}" is not a finite number`);
  }
  return value;
}

export function governedMeasurementsFromUnknown(
  raw: unknown
): Record<string, number | undefined> {
  if (raw == null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('STOP: measurements must be an object');
  }
  const next: Record<string, number | undefined> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    if (key === 'notes') continue;
    const classified = classifyMeasurementField(key);
    if (classified === 'unknown') {
      throw new Error(`STOP: measurement field "${key}" is unassignable`);
    }
    next[key] = assertNoSilentCoercion(value, key);
  }
  return next;
}

export function assertGovernedPatternKind(kind: string): asserts kind is StylePatternKind {
  if (!PATTERN_KINDS.includes(kind as StylePatternKind)) {
    throw new Error(`STOP: unknown pattern kind "${kind}"`);
  }
}

export function assertGovernedLengthUnit(unit: string | undefined): LengthUnit {
  const resolved = unit || 'cm';
  assertLengthUnit(resolved);
  return resolved;
}

export function rejectFabricQuantityOnBodyInput(unitFamily: 'body-length' | 'fabric-quantity') {
  if (unitFamily === 'fabric-quantity') refuseImplicitBodyToFabricConversion();
}

export function assertProductionMeasurementUnit(unit: string | undefined): void {
  if (unit && unit !== 'cm') {
    throw new Error('STOP: production computation measurement inputs must be centimetres');
  }
}
