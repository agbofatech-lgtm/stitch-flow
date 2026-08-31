import {
  BODY_MEASUREMENT_FIELDS,
  GARMENT_MEASUREMENT_FIELDS,
  PATTERN_INPUT_FIELDS,
  classifyMeasurementField,
  type PatternKind,
} from './fields';
import { asNumber, readAliasedNumber } from './aliases';

export type BodyMeasurementSet = {
  class: 'body';
  unit: 'cm';
  fields: Record<string, number>;
};

export type GarmentMeasurementSet = {
  class: 'garment';
  unit: 'cm';
  fields: Record<string, number>;
  notes?: string;
};

export type PatternMeasurementSet = {
  class: 'pattern';
  unit: 'cm';
  kind: PatternKind;
  fields: Record<string, number>;
  derivedFrom: 'body+garment';
};

export type SeparatedMeasurements = {
  body: BodyMeasurementSet;
  garment: GarmentMeasurementSet;
  pattern?: PatternMeasurementSet;
};

const NUMERIC_SKIP = new Set(['notes', 'measurements', 'metadata', 'profileMetadata']);

export function separateLegacyMeasurementBlob(
  source?: Record<string, unknown> | null,
  patternKind?: PatternKind
): SeparatedMeasurements {
  const bodyFields: Record<string, number> = {};
  const garmentFields: Record<string, number> = {};
  let notes: string | undefined;

  if (source) {
    if (typeof source.notes === 'string' && source.notes.trim()) {
      notes = source.notes;
    }

    for (const key of BODY_MEASUREMENT_FIELDS) {
      const value = readAliasedNumber(source, key);
      if (value !== undefined) bodyFields[key] = value;
    }

    for (const key of GARMENT_MEASUREMENT_FIELDS) {
      if (key === 'notes') continue;
      const value = readAliasedNumber(source, key);
      if (value !== undefined) garmentFields[key] = value;
    }

    for (const [key, raw] of Object.entries(source)) {
      if (NUMERIC_SKIP.has(key)) continue;
      if (classifyMeasurementField(key) !== 'unknown') continue;
      const value = asNumber(raw);
      if (value === undefined) continue;
      throw new Error(
        `STOP: measurement field "${key}" is unassignable to body or garment. Do not guess.`
      );
    }
  }

  const separated: SeparatedMeasurements = {
    body: { class: 'body', unit: 'cm', fields: bodyFields },
    garment: { class: 'garment', unit: 'cm', fields: garmentFields, notes },
  };

  if (patternKind) {
    separated.pattern = projectPatternMeasurements(separated, patternKind);
  }

  return separated;
}

export function projectPatternMeasurements(
  separated: SeparatedMeasurements,
  kind: PatternKind
): PatternMeasurementSet {
  const combined: Record<string, number> = {
    ...separated.body.fields,
    ...separated.garment.fields,
  };
  const fields: Record<string, number> = {};
  for (const key of PATTERN_INPUT_FIELDS[kind]) {
    if (typeof combined[key] === 'number') {
      fields[key] = combined[key];
    }
  }
  return {
    class: 'pattern',
    unit: 'cm',
    kind,
    fields,
    derivedFrom: 'body+garment',
  };
}

export function flattenSeparated(separated: SeparatedMeasurements): Record<string, unknown> {
  return {
    ...separated.body.fields,
    ...separated.garment.fields,
    ...(separated.garment.notes ? { notes: separated.garment.notes } : {}),
  };
}

export function assertPatternIsDerived(set: PatternMeasurementSet): void {
  if (set.derivedFrom !== 'body+garment') {
    throw new Error('STOP: PatternMeasurement must remain a derived projection');
  }
}
