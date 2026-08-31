# T7 Design Studio Extraction Plan

**Status:** Plan only. **No extraction in this cycle.**

## Gate

T7 deep extraction requires owner confirmation after this forensic stage.

## Order of operations (PROPOSAL)

1. **Freeze** `DesignStudio.tsx` as behavioural reference (already T0 protected).
2. **Fixtures** (not started): canvas pieces vs silhouette; `handleSaveToOrder` payload; draft read/write; garment-type mapping.
3. **Re-point** engine imports to T3 wrappers only if fixtures stay green.
4. **Do not** move silhouette builders into `patternEngine.ts`.
5. **Do not** redesign the UI, tokens, or layout as a “new Design Studio”.
6. **Do not** remove `stitchflow:design-studio:drafts` without an ADR.
7. **Do not** unify Studio save with T6 `saveStudioOutputToOrder` without documenting snapshot-shape differences.

## Stop conditions

- Any visual or numeric drift vs current Studio → STOP.
- Any Pattern Engine / Production Assistant byte change → STOP.
- Extraction that requires guessing untyped `../types` fields → STOP.
- Material risk remaining after forensics → wait for owner.

## This cycle

IMPLEMENTED: forensic map, boundary map, this plan, architecture gate, pending owner form.  
NOT STARTED: code extraction.
