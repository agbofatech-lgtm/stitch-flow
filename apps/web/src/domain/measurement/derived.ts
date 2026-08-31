/**
 * Phase 13 derived-output taxonomy.
 * Keys observed on PatternOutput (shared/types + engine draft measurements).
 * Not body/garment capture. Not a second formula table.
 */

import { classifyMeasurementField } from './fields';

/** FACT: BodiceCalculatedMeasurements plus generic draft extras that are not capture fields. */
export const DERIVED_PATTERN_OUTPUT_KEYS = [
  'quarterBust',
  'quarterWaist',
  'neckWidth',
  'neckDepth',
  'dartIntake',
  'waistQuarter',
  'hipQuarter',
  'crotchExtension',
  'hemWidth',
  'hipDrop',
] as const;

const DERIVED_SET = new Set<string>(DERIVED_PATTERN_OUTPUT_KEYS);

export type MeasurementValueClass = 'body' | 'garment' | 'derived-output' | 'unknown';

export function classifyMeasurementValueKey(key: string): MeasurementValueClass {
  const captured = classifyMeasurementField(key);
  if (captured !== 'unknown') return captured;
  if (DERIVED_SET.has(key)) return 'derived-output';
  return 'unknown';
}

export function assertNotDerivedCapture(fields: Record<string, unknown>): void {
  for (const key of Object.keys(fields)) {
    if (classifyMeasurementValueKey(key) === 'derived-output') {
      throw new Error(
        `STOP: \"${key}\" is a derived pattern output, not body/garment capture. Do not store it as a measurement.`
      );
    }
  }
}
