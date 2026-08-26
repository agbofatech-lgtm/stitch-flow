const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const DATE_FIELD_NAMES = new Set([
  'createdAt',
  'updatedAt',
  'issueDate',
  'dueDate',
  'paidAt',
  'alertDate',
  'completedAt',
  'trialExpiresAt',
  'overrideExpiresAt',
  'generatedAt',
]);

function shouldReviveDate(key: string, value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!ISO_DATE_REGEX.test(value)) return false;

  return (
    DATE_FIELD_NAMES.has(key) ||
    key.endsWith('At') ||
    key.endsWith('Date') ||
    key.endsWith('ExpiresAt')
  );
}

function dateReviver(key: string, value: unknown): unknown {
  if (shouldReviveDate(key, value)) {
    return new Date(value);
  }

  return value;
}

export function serializeForStorage<T>(value: T): string {
  return JSON.stringify(value);
}

export function deserializeFromStorage<T>(raw: string): T {
  return JSON.parse(raw, dateReviver) as T;
}

export function cloneWithDates<T>(value: T): T {
  return deserializeFromStorage<T>(serializeForStorage(value));
}
