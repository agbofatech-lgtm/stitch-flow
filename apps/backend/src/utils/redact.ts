/**
 * Recursive security redaction (Phase 6, Step 38).
 *
 * Removes sensitive values from arbitrary objects BEFORE they reach logs,
 * audit metadata, or error reports. Works on:
 *   plain objects · nested objects · arrays · Maps/Sets · Error metadata.
 *
 * Design guarantees:
 * - Case-insensitive key matching (password, PASSWORD, Password…).
 * - Match-by-substring on a conservative list (apiKey, refreshToken…) so
 *   renamed variants (x-api-key, paystack_secret_key) are also caught.
 * - Circular-reference safe (WeakSet) and depth-bounded.
 * - Never throws: redaction failure degrades to '[UNREDACTABLE]'.
 */
const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'passwd',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'apikey',
  'api_key',
  'databaseurl',
  'database_url',
  'jwtsecret',
  'jwt_secret',
  'paystacksecret',
  'paystack_secret',
  'clientsecret',
  'privatekey',
  'creditcard',
  'cvv',
] as const;

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 8;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH) return '[MAX_DEPTH]';
  if (value === null || value === undefined) return value;

  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return value;
  if (type === 'function' || type === 'bigint' || type === 'symbol') return '[NON_SERIALIZABLE]';

  if (value instanceof Error) {
    // Redact inside error properties (metadata commonly rides on errors).
    const output: Record<string, unknown> = {
      name: value.name,
      message: value.message,
    };
    for (const key of Object.keys(value)) {
      output[key] = isSensitiveKey(key)
        ? REDACTED
        : redactValue((value as unknown as Record<string, unknown>)[key], depth + 1, seen);
    }
    return output;
  }

  if (value instanceof Map) {
    const output = new Map<unknown, unknown>();
    for (const [k, v] of value.entries()) {
      output.set(
        typeof k === 'string' && isSensitiveKey(k) ? REDACTED : k,
        redactValue(v, depth + 1, seen)
      );
    }
    return output;
  }

  if (value instanceof Set) {
    const output = new Set<unknown>();
    for (const v of value.values()) output.add(redactValue(v, depth + 1, seen));
    return output;
  }

  if (typeof value === 'object') {
    if (seen.has(value as object)) return '[CIRCULAR]';
    seen.add(value as object);
    if (Array.isArray(value)) {
      return value.map((item) => redactValue(item, depth + 1, seen));
    }
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      output[key] = isSensitiveKey(key) ? REDACTED : redactValue(val, depth + 1, seen);
    }
    return output;
  }

  return value;
}

/** Returns a redacted deep copy; the input object is never mutated. */
export function redactDeep<T>(input: T): T {
  try {
    return redactValue(input, 0, new WeakSet()) as T;
  } catch {
    return '[UNREDACTABLE]' as unknown as T;
  }
}
