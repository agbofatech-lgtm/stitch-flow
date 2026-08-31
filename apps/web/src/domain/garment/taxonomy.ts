/**
 * Phase 14 garment taxonomy.
 * Known types are FACT from shared/types GarmentType.
 * Engine mapping is compatibility, not classification authority.
 */

import { mapGarmentTypeToPatternKind } from '../pattern/gateway';
import type { PatternKind } from '../measurement/fields';

export const KNOWN_GARMENT_TYPES = [
  'bodice',
  'shirt',
  'trouser',
  'skirt',
  'kaftan',
  'dress',
  'gown',
  'senator',
  'agbada',
  'blouse',
  'custom',
] as const;

export type KnownGarmentType = (typeof KNOWN_GARMENT_TYPES)[number];

export const KNOWN_FIT_TYPES = [
  'slim',
  'regular',
  'relaxed',
  'oversized',
  'tailored',
  'custom',
] as const;

export type KnownFitType = (typeof KNOWN_FIT_TYPES)[number];

export type GarmentTypeStatus = 'known' | 'unknown' | 'absent';

const GARMENT_SET = new Set<string>(KNOWN_GARMENT_TYPES);
const FIT_SET = new Set<string>(KNOWN_FIT_TYPES);

export function isKnownGarmentType(value: string): value is KnownGarmentType {
  return GARMENT_SET.has(value);
}

export function isKnownFitType(value: string): value is KnownFitType {
  return FIT_SET.has(value);
}

export function classifyGarmentType(raw: unknown): {
  status: GarmentTypeStatus;
  known: KnownGarmentType | null;
  raw: string | undefined;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { status: 'absent', known: null, raw: undefined };
  }
  if (typeof raw !== 'string') {
    return { status: 'unknown', known: null, raw: String(raw) };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { status: 'absent', known: null, raw: undefined };
  }
  if (isKnownGarmentType(trimmed)) {
    return { status: 'known', known: trimmed, raw: trimmed };
  }
  return { status: 'unknown', known: null, raw: trimmed };
}

export function classifyFitType(raw: unknown): {
  status: GarmentTypeStatus;
  known: KnownFitType | null;
  raw: string | undefined;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { status: 'absent', known: null, raw: undefined };
  }
  if (typeof raw !== 'string') {
    return { status: 'unknown', known: null, raw: String(raw) };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { status: 'absent', known: null, raw: undefined };
  }
  if (isKnownFitType(trimmed)) {
    return { status: 'known', known: trimmed, raw: trimmed };
  }
  return { status: 'unknown', known: null, raw: trimmed };
}

/**
 * Isolated legacy compatibility. NOT Phase 14 intelligence authority.
 * Unknown strings still default to bodice inside the pre-existing T3 map.
 */
export function legacyPatternKindCompatibility(garmentType: string): {
  patternKind: PatternKind;
  authority: 'legacy-map';
} {
  return {
    patternKind: mapGarmentTypeToPatternKind(garmentType),
    authority: 'legacy-map',
  };
}
