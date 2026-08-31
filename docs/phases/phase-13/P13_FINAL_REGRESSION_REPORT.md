# P13 Final Regression Report

Date: 2026-08-31. HEAD before this verification commit: `7d4ab50e785fd551861aeac94e4154e62c1b32db`.

| Suite | Result |
|---|---|
| `test:domain` (incl. T8 + P13) | 33 pass / 0 fail |
| `test:deterministic` | 22 pass / 0 fail |
| `test:tailoring` | 8 pass / 0 fail |
| `test:design` | 7 pass / 0 fail |
| `test:studio` | 4 pass / 0 fail |
| `test:workflow` | 8 pass / 0 fail |
| `test:experience` | 8 pass / 0 fail |
| `test:persistence` | 10 pass / 0 fail |
| `vite build` | **PASS** (2833 modules) |
| `tsc --noEmit` | **PRE-EXISTING FAIL** — not PASS |

## Known failures (explicit)

`tsc --noEmit` EXIT 2:

- `src/shared/api/materials.ts` — corrupted syntax (pre-T0/T10)
- `src/shared/api/reports.ts` — corrupted syntax
- `src/types.ts` — overwritten with non-types content

These are **PRE-EXISTING**. They are not Phase 13 regressions. They are not PASS.
