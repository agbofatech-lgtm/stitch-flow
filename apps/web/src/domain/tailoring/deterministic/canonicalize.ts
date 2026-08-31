/**
 * T10.1 canonicalization. Object key order must not affect identity.
 * Does not fill engine defaults. Does not guess missing measurements.
 */

export function omitAbsent<T extends Record<string, unknown>>(
  input: T
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    const value = input[key];
    if (value === undefined || value === null) continue;
    next[key] = value;
  }
  return next;
}

export function canonicalize(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('STOP: non-finite number is not canonical');
    }
    return value;
  }
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map((item) => {
      const next = canonicalize(item);
      return next === undefined ? null : next;
    });
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const next: Record<string, unknown> = {};
    for (const key of keys) {
      const item = record[key];
      if (item === undefined || item === null) continue;
      next[key] = canonicalize(item);
    }
    return next;
  }
  throw new Error('STOP: value is not canonicalizable');
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function canonicalizeMeasurementMap(
  measurements: Record<string, number | undefined>
): Record<string, number> {
  const numeric: Record<string, number> = {};
  for (const [key, value] of Object.entries(measurements)) {
    if (typeof value !== 'number') continue;
    if (!Number.isFinite(value)) {
      throw new Error(`STOP: measurement "${key}" is not finite`);
    }
    numeric[key] = value;
  }
  return canonicalize(numeric) as Record<string, number>;
}
