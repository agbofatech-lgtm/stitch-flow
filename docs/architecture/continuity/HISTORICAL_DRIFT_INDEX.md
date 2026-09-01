# Historical Drift Index

**Date:** 2026-09-01  
**Rule:** do not rewrite historical artifacts. Record `HISTORICAL → LATER → CURRENT AUTHORITY`.

Older docs remain evidence of what was true *then*. This pack is the synthesis of what is true *now*.

---

### D1 — Live backend entrypoint

| | |
|---|---|
| HISTORICAL | T0 `RUNTIME_TRUTH_MAP.md`: `server.ts` is hardcoded JSON stub; `app.ts` not started |
| LATER | T1: `server.ts` → `createApp()`; stub isolated as `server.stub.ts` |
| CURRENT | P19 `createApp()` always mounts `/auth` `/platform` `/control`; shop CRUD still opt-in |

### D2 — IndexedDB / offline

| | |
|---|---|
| HISTORICAL | T0 DATA_AUTHORITY_MAP: no IndexedDB, no service worker |
| LATER | T2 IndexedDB/memory + blocked sync |
| CURRENT | T2 starts at boot; shop SoT still localStorage; still no SW |

### D3 — T3 ownership of billing and Control Center

| | |
|---|---|
| HISTORICAL | `domain/ownership.ts` and T3 contract: `saas-billing` and `agbofa-control-center` **unassignable** |
| LATER | P19 implemented both on the backend |
| CURRENT | P19 platform is authority for those planes. T3 file is a frozen T3 artifact. Do not “fix” it as if T3 never said that |

### D4 — T9 “Control Center does not exist”

| | |
|---|---|
| HISTORICAL | T9 domain contract map: Control Center unassignable / absent |
| LATER | P19 Control Center API; PEX Control Center UI |
| CURRENT | `/control/*` + `ControlCenter.tsx`. T9 map is historical |

### D5 — P19.11 “Control Center no UI”

| | |
|---|---|
| HISTORICAL | P19.11 independent certification: Control Center PASS (API plane; no UI) |
| LATER | PEX P5–P10 Control Center visual plane |
| CURRENT | UI exists; still operator-gated; still not tailoring authority |

### D6 — CORS

| | |
|---|---|
| HISTORICAL | T0 stub allowlist including LAN IP `192.168.100.4` |
| LATER | T1 `app.ts` `origin: true` |
| CURRENT | Live CORS reflects any origin; `CORS_ORIGIN` env unused |

### D7 — `docs/api.md` `/api/v1`

| | |
|---|---|
| HISTORICAL | Auth/license/sync documented under `/api/v1` |
| LATER | Never mounted on live `app.ts` |
| CURRENT | Unprefixed `/auth` `/platform` `/control`. `docs/api.md` is drift |

### D8 — Design Studio hash

| | |
|---|---|
| HISTORICAL | T0 SHA-256 `78ddd839…` |
| LATER | T7 import/draft extraction → `5059c0db…` |
| CURRENT | `5059c0db…` is the freeze identity for Studio (engines still T0 hashes) |

### D9 — T0 “no `/health` on live process”

| | |
|---|---|
| HISTORICAL | Stub lacked `/health` |
| LATER | T1 added `/health` and `/ready` |
| CURRENT | Both live on `app.ts` |

### D10 — Architecture README “T0 maps are current truth”

| | |
|---|---|
| HISTORICAL | `docs/architecture/README.md` (T0): repository evidence (T0) is current truth |
| LATER | T1–T10, P13–P19, PEX |
| CURRENT | This continuity pack is the **synthesis of current authority**. T0 maps remain the T0 lock. See README pointer added 2026-09-01. T0 files themselves are not rewritten |

### D11 — FeatureGate as billing

| | |
|---|---|
| HISTORICAL | T0: FeatureGate `alert()`; two price tables |
| LATER | P19 server `decideAccess`; catalog amounts null |
| CURRENT | FeatureGate still UX_ONLY; server is law for `/platform/*` only |

### D12 — Master matrix “authorized stage is T0”

| | |
|---|---|
| HISTORICAL | `MASTER_TRANSFORMATION_PHASE_MATRIX.md` operational copy still says authorized stage is T0 until owner accepts T0 exit |
| LATER | T0 was accepted; T1–T10 and P13–P18 tagged |
| CURRENT | Treat that sentence as an unupdated pointer file, not as a lock against later accepted stages. Do not rewrite the matrix in this pack beyond noting drift |
