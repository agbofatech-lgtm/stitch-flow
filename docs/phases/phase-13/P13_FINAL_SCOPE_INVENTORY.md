# P13 Final Scope Inventory

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Baseline | T10 `563a240db2ba453c1b0196d84ce3752c7b9f6689` |
| HEAD at inventory | `7d4ab50e785fd551861aeac94e4154e62c1b32db` |
| Legend | **FACT** |

Classification: REQUIRED · SUPPORTING · TRANSITIONAL · DEFERRED · OUT OF SCOPE

| Change | Classification | Justification |
|---|---|---|
| `docs/phases/phase-13/*` Stage 0 + verification | REQUIRED | Owner PART IX / this gate |
| `domain/measurement/taxonomy.ts` | REQUIRED | Live vs frozen vs derived vs set |
| `domain/measurement/completeness.ts` | REQUIRED | `PATTERN_INPUT_FIELDS` + existing garment map |
| `domain/measurement/plausibility.ts` | REQUIRED | Structural vs engine observation |
| `domain/measurement/derived.ts` | REQUIRED | PatternOutput keys are not capture |
| `application/measurement/versionAuthority.ts` | REQUIRED | T8 freeze → T2 create-only |
| `application/measurement/t10Integration.ts` | REQUIRED | Complete frozen version → T10 governed pattern |
| `application/measurement/intelligence.ts` | REQUIRED | Named evaluate / freeze / execute |
| `measurement.p13.test.ts` | REQUIRED | Regression |
| Measurement workspace freeze/completeness UI | SUPPORTING | Surfaces authority; no new localStorage |
| `apps/web/package.json` test:domain includes p13 | SUPPORTING | Suite wiring |
| AppContext profiles / order snapshot | TRANSITIONAL | Pre-existing; not migrated |
| Studio drafts key | TRANSITIONAL / LEGACY | Unchanged T7 key |
| Design Studio T7 identity re-exports | TRANSITIONAL | T10 C1; not claimed migrated |
| Hip 98/100/102 reconciliation | DEFERRED | T10 C3 |
| Studio exclusive governed path | DEFERRED | T10 C1 |
| Canvas / PDF / historical inches | DEFERRED | T10 C4–C6 |
| Measurement confidence / version lineage parentId | DEFERRED | No repo evidence |
| AI / 3D / billing / Control Center | OUT OF SCOPE | Locked |
| Pattern Engine / Production Assistant / Design Studio edits | OUT OF SCOPE | Protected; hashes UNCHANGED |

No OUT OF SCOPE code was added. Compiling is not acceptance.
