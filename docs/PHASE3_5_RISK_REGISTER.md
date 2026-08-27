# PHASE 3.5 RISK REGISTER

| ID | Sev | Component | File | Problem | Impact | Root cause | Fix | Test | Status |
|----|-----|-----------|------|---------|--------|-----------|-----|------|--------|
| R1 | P2 | UI read path | components/* | UI reads still come from AppContext/localStorage, not the local repositories | Dexie is a mirror for reads; multi-device deltas don't yet flow into open UI screens | Full cutover requires async context refactor (deferred to keep §37: no UI breakage) | Phase 4: swap AppContext hydration/reads to local repositories + delta subscription | integration tests cover bridge; cutover untested | OPEN (documented) |
| R2 | P2 | Offline financial UX | Invoices.tsx | Offline payment queueing not wired into the payment modal (engine + repo support it and it is tested at that layer) | Offline-created payments via UI still fail fast instead of queueing | UX decisions (pending-payment display) out of §37 scope | Phase 4 UI affordance using paymentLocalRepository | engine-level flow tested | OPEN (documented) |
| R3 | P3 | Multi-tab | syncEngine.ts | navigator.locks absent in very old browsers -> per-tab single-flight only | Rare duplicate submissions, all server-idempotent | API availability | acceptable (server idempotency authoritative) | concurrency test + server dedupe tests | MITIGATED |
| R4 | P3 | Mirror lag | appStateBridge.ts | 250ms debounce means a crash within the window can lose the *mirror* update (localStorage copy is still written synchronously) | negligible: localStorage remains source for UI reads | debounce tradeoff | none needed now | debounce test | ACCEPTED |
| R5 | P3 | Sync-mutation materialization | server | /sync/mutations logs state changes but does not materialize business tables server-side (Phase 3 documented decision) | cross-device state converges via log; REST remains materialization path | Phase 3 design | revisit with Phase 4 read-path cutover | sync-v2 backend tests | OPEN (inherited) |

No P0/P1 issues open. R1/R2 are scoped follow-ups, not correctness defects: all committed
sync/financial behavior is server-authoritative and idempotent.
