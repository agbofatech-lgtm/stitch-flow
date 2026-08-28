/**
 * Phase 9 — phone-number identity normalization.
 *
 * Single reusable normalization layer for registration, login, recovery and
 * (future) verification/customer records. Canonical storage form is E.164
 * (e.g. `+233241234567`).
 *
 * Ghana rules (no external phone library is installed in this codebase, so
 * the rules are implemented and documented here):
 *  - Ghana country code: +233.
 *  - Mobile national significant numbers (NSN) are 9 digits whose network
 *    prefix begins with 2 or 5 — this covers the commonly used prefixes
 *    (020, 023–028, 050, 053–057, 059 …) without hard-coding each one.
 *  - Local format: leading trunk `0` + 9-digit NSN (10 digits total),
 *    e.g. `0241234567` → `+233241234567`.
 *  - International formats accepted: `+233…`, `00233…`, `233…` (12 digits).
 *
 * Numbers are VALIDATED before normalization — we never blindly prepend
 * `+233` to arbitrary input. Non-Ghana E.164 numbers (e.g. `+225…`) are
 * accepted only when they are already valid international E.164, so the
 * layer generalizes beyond Ghana without guessing local formats elsewhere.
 */

export type PhoneNormalization =
  | { ok: true; e164: string }
  | { ok: false; code: 'INVALID_PHONE_NUMBER' };

const GHANA_COUNTRY_CODE = '233';
/** 9-digit Ghana mobile NSN: network prefix starts with 2 or 5. */
const GH_MOBILE_NSN = /^[25]\d{8}$/;
/** Generic E.164: '+' followed by 7–15 digits, no leading zero. */
const GENERIC_E164 = /^\+[1-9]\d{6,14}$/;

function fail(): PhoneNormalization {
  return { ok: false, code: 'INVALID_PHONE_NUMBER' };
}

/**
 * Normalize user-entered phone input to canonical E.164.
 * Returns { ok: false } for anything that cannot be validated — callers
 * decide whether that is a 400 (registration) or an authentication miss.
 */
export function normalizePhone(input: string): PhoneNormalization {
  if (typeof input !== 'string') return fail();

  // Strip common formatting: spaces, dashes, dots, parentheses.
  let s = input.trim().replace(/[\s\-.()]/g, '');
  if (!s) return fail();

  // International dialing prefix `00` → `+`.
  if (s.startsWith('00')) s = '+' + s.slice(2);

  if (s.startsWith('+')) {
    if (!GENERIC_E164.test(s)) return fail();
    const withoutPlus = s.slice(1);
    if (withoutPlus.startsWith(GHANA_COUNTRY_CODE)) {
      const nsn = withoutPlus.slice(GHANA_COUNTRY_CODE.length);
      if (!GH_MOBILE_NSN.test(nsn)) return fail();
    }
    return { ok: true, e164: s };
  }

  // From here: digits only.
  if (!/^\d+$/.test(s)) return fail();

  // Ghana local format: 0 + 9-digit NSN.
  if (s.length === 10 && s.startsWith('0')) {
    const nsn = s.slice(1);
    if (!GH_MOBILE_NSN.test(nsn)) return fail();
    return { ok: true, e164: `+${GHANA_COUNTRY_CODE}${nsn}` };
  }

  // Ghana NSN typed without the trunk 0 (e.g. "241234567").
  if (s.length === 9 && GH_MOBILE_NSN.test(s)) {
    return { ok: true, e164: `+${GHANA_COUNTRY_CODE}${s}` };
  }

  // International without '+': 233 + 9-digit NSN.
  if (s.length === 12 && s.startsWith(GHANA_COUNTRY_CODE) && GH_MOBILE_NSN.test(s.slice(3))) {
    return { ok: true, e164: `+${s}` };
  }

  return fail();
}

/** True when the identifier looks like an email rather than a phone number. */
export function isEmailIdentifier(identifier: string): boolean {
  return typeof identifier === 'string' && identifier.includes('@');
}
