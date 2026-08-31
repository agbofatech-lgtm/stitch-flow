/**
 * T8 measurement domain contract.
 * INPUT → RULE → OUTPUT is explicit. Pattern fields stay derived.
 */

import { classifyMeasurementField } from './fields';
import { assertPatternIsDerived, flattenSeparated } from './separate';
import { ENGINE_LENGTH_UNIT } from './units';
import { isDerivedSource } from './provenance';
import {
  assertVersionFrozen,
  type MeasurementVersionRecord,
} from './version';

const UI_ONLY_KEYS = new Set([
  'selectedTab',
  'activeTab',
  'isDragging',
  'canvasZoom',
  'hoveredElement',
  'panelOpen',
  'mousePosition',
  'previewMode',
  'showGrid',
  'scale',
]);

export function validateMeasurementValue(field: string, value: unknown): number {
  const classified = classifyMeasurementField(field);
  if (classified === 'unknown' && field !== 'notes') {
    throw new Error(`STOP: measurement field "${field}" is unassignable`);
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`STOP: measurement "${field}" is not a finite number`);
  }
  return value;
}

export function assertNoUiStateInMeasurement(value: Record<string, unknown>): void {
  for (const key of Object.keys(value)) {
    if (UI_ONLY_KEYS.has(key)) {
      throw new Error(`STOP: measurement contract must not contain UI state "${key}"`);
    }
  }
}

export function engineInputFromVersion(
  version: MeasurementVersionRecord
): Record<string, number> {
  assertVersionFrozen(version);
  if (version.canonicalUnit !== ENGINE_LENGTH_UNIT) {
    throw new Error('STOP: engine input must be centimetres');
  }
  if (version.pattern) {
    assertPatternIsDerived(version.pattern);
  }
  const flat = flattenSeparated({
    body: version.body,
    garment: version.garment,
    pattern: version.pattern,
  });
  assertNoUiStateInMeasurement(flat);
  const input: Record<string, number> = {};
  for (const [key, raw] of Object.entries(flat)) {
    if (key === 'notes') continue;
    if (typeof raw === 'number') input[key] = validateMeasurementValue(key, raw);
  }
  return input;
}

export function assertCapturedNotDerived(version: MeasurementVersionRecord): void {
  if (isDerivedSource(version.provenance.source)) {
    throw new Error('STOP: captured body/garment version must not use derived-formula source');
  }
}
