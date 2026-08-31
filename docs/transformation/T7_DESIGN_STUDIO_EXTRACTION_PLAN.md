# T7 Design Studio Extraction Plan

**Status:** Authorized adapter slice **implemented**. Owner Acceptance **PENDING**.

## Gate

T7 deep rewrite remains forbidden. This cycle extracted imports/persistence helpers only.

## Order of operations

1. **Freeze** engines and canvas/UI as behavioural reference — **DONE** (engines T0 hashes).
2. **Adapters** wrapping existing engine signatures — **DONE**.
3. **Re-point** Design Studio engine/draft imports — **DONE**.
4. **Do not** move silhouette builders into `patternEngine.ts` — **HELD**.
5. **Do not** redesign the UI, tokens, or layout — **HELD**.
6. **Do not** remove `stitchflow:design-studio:drafts` — **HELD** (moved to `draftStore.ts`, same key).
7. **Do not** unify Studio save with T6 `saveStudioOutputToOrder` — **HELD** (`saveContract.ts`).

## Stop conditions (still live)

- Any Pattern Engine / Production Assistant byte change → STOP.
- Merging the two save paths without owner authorization → STOP.
- New localStorage key → STOP.
- T7 tag without owner ACCEPT → STOP.
- T8 / Phase 13 without T7 checkpoint → STOP.

## This cycle

IMPLEMENTED: adapters, save-path contract, draft store (legacy key), specification serializer, Design Studio import re-point, tests, verification docs.  
NOT STARTED: canvas extraction, T3 gateway re-point inside Studio, T2 draft migration, T8.
