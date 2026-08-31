/**
 * T9 unit families. Reuses T8 length conversion. Fabric quantity is a different family.
 * Body centimetres must never be silently treated as fabric yards.
 */

import {
  CM_PER_INCH,
  ENGINE_LENGTH_UNIT,
  assertLengthUnit,
  convertFieldMap,
  convertLength,
  fromCentimetres,
  toCentimetres,
  type LengthUnit,
} from '../../domain/measurement/units';
import type { MaterialUnit } from '../../shared/types';

export {
  CM_PER_INCH,
  ENGINE_LENGTH_UNIT,
  assertLengthUnit,
  convertFieldMap,
  convertLength,
  fromCentimetres,
  toCentimetres,
};
export type { LengthUnit };

/** FACT: Production Assistant default fabric unit. Not a body-length unit. */
export const DEFAULT_FABRIC_QUANTITY_UNIT: MaterialUnit = 'yards';

/** International yard. Named — used only for fabric quantity, never body length. */
export const METRES_PER_YARD = 0.9144;

export type UnitFamily = 'body-length' | 'fabric-quantity';

export function assertFabricQuantityUnit(unit: string): asserts unit is MaterialUnit {
  if (unit === 'yards' || unit === 'meters' || unit === 'pieces') return;
  throw new Error(`STOP: unknown fabric quantity unit "${unit}". Do not guess.`);
}

export function toYards(value: number, unit: Exclude<MaterialUnit, 'pieces'>): number {
  if (!Number.isFinite(value)) {
    throw new Error('STOP: fabric quantity is not finite');
  }
  if (unit === 'yards') return value;
  return value / METRES_PER_YARD;
}

export function fromYards(yards: number, unit: Exclude<MaterialUnit, 'pieces'>): number {
  if (!Number.isFinite(yards)) {
    throw new Error('STOP: fabric quantity is not finite');
  }
  if (unit === 'yards') return yards;
  return yards * METRES_PER_YARD;
}

export function refuseImplicitBodyToFabricConversion(): never {
  throw new Error(
    'STOP: body centimetres are not fabric yards. Convert only within the same unit family.'
  );
}

export function assertSameUnitFamily(left: UnitFamily, right: UnitFamily): void {
  if (left !== right) {
    refuseImplicitBodyToFabricConversion();
  }
}
