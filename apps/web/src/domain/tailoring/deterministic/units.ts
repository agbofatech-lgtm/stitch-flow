/**
 * T10.1 unit safety. Reuses T8. Does not convert body cm into fabric yards.
 */

import {
  CM_PER_INCH,
  ENGINE_LENGTH_UNIT,
  convertFieldMap,
  toCentimetres,
  type LengthUnit,
} from '../../measurement/units';

export { CM_PER_INCH, ENGINE_LENGTH_UNIT, convertFieldMap, toCentimetres };
export type { LengthUnit };

export type UnitFamily = 'body-length' | 'fabric-quantity';

export function refuseImplicitBodyToFabricConversion(): never {
  throw new Error(
    'STOP: body centimetres are not fabric yards. Convert only within the same unit family.'
  );
}

export function assertSameUnitFamily(left: UnitFamily, right: UnitFamily): void {
  if (left !== right) refuseImplicitBodyToFabricConversion();
}

export function assertCentimetreInput(unit: LengthUnit | undefined): void {
  if (unit && unit !== ENGINE_LENGTH_UNIT) {
    throw new Error('STOP: production computation measurement inputs must be centimetres');
  }
}
