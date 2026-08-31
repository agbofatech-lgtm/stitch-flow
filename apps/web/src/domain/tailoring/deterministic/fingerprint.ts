/**
 * T10.1 fingerprint. FNV-1a 64-bit. NOT a cryptographic guarantee.
 */

import { canonicalJson } from './canonicalize';

export const FINGERPRINT_ALGORITHM = 'fnv1a-64' as const;

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

export function fnv1a64Hex(text: string): string {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash.toString(16).padStart(16, '0');
}

export function fingerprintCanonicalPayload(payload: unknown): string {
  return fnv1a64Hex(canonicalJson(payload));
}
