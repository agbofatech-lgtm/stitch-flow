# P19.10 Production Hardening Report

Implementation: `05528f2f268a0a08e2b4e877466ac5200048d06b`

## Mission

Harden the commercial/platform boundary without contaminating Trusted Core, inventing prices, selecting a PSP, or applying unverified Postgres.

## What changed (FACT)

- Durable file writes are atomic (`*.tmp` + rename) with mode `0o600`.
- Corrupt / wrong-version snapshots throw `STORE_CORRUPT` (fail closed). Missing file still creates empty store.
- JWT rejects extra claims: `role`, `operator`, `isPlatformOperator`, `entitlements`, `capabilities` (plus prior commercial claims).
- Register/login ignore client operator fields. No HTTP operator-grant route.
- `/platform/access/check` ignores client `allowed` / `entitled` / `decision`.
- Identity register/login append audit rows (no password material).
- Control Center `/control/status` reports injected vs memory/file driver; `postgres: not-verified`.

## What did not change (FACT)

- Postgres not applied. `002`–`005` empty. `006` on disk only.
- Live PSP deferred. Test HMAC adapter only.
- FeatureGate remains UX_ONLY.
- Pattern Engine, Production Assistant, Design Studio, shared types hashes unchanged.
- No logout/refresh session denylist invented (UNKNOWN / NOT IMPLEMENTED).
- No period-end cancellation invented (IMMEDIATE transitional).
- No frontend Digital Atelier redesign.

## Result

**P19.10: CONDITIONAL**
