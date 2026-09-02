# SER-F10 Control Center forensic audit

Stage 0–2. Investigation preceded implementation. This map classifies existing authority. It does not create authority.

F1 document [`SER-F1_CONTROL_CENTER_RELATIONSHIP.md`](./SER-F1_CONTROL_CENTER_RELATIONSHIP.md) historically equated the visible Control Center with an AGBOFA operator JWT overlay. **SER-F10 supersedes that conceptual identity without rewriting F1.** The StitchFlow Control Center is the workspace operator plane. The AGBOFA Platform Control Center remains ADR-007 / LOCKED.

## Repository baseline

| Item | Value |
|---|---|
| Branch | `arena/01a05677-stitch-flow` |
| Remote | `origin/arena/01a05677-stitch-flow` |
| HEAD before F10 | `46974583767eae322527ff2ae3a97cdfb84462fc` (SER-F9 docs) |
| Unrelated dirt | `package-lock.json`, `pnpm-*.yaml`, nested `stitch-flow/` — preserved, not committed |

## A. What exists

| Surface | File | Route / mount | Data source | Persistence | Authority | Functional? | Safe to host? | Safe to redesign? |
|---|---|---|---|---|---|---|---|---|
| Control Center | `apps/web/src/control/ControlCenter.tsx` | Studio nav `control`; `data-plane="control"` | AppContext workspace/member + optional `/auth/login` + `/control/*` probe | Local workspace store; probe is HTTP | Workspace observation + optional platform API probe | Yes as overlay | Yes | Yes as operator plane; not as platform product |
| Platform client | `apps/web/src/control/platformClient.ts` | `/auth/login`, `/control/*` via Vite proxy | Backend if reachable | None in UI | Probe only | Only if backend + operator JWT | Host as probe | Do not present as workspace sign-in |
| Backend control routes | `apps/backend/src/routes/controlRoutes.ts` mounted at `/control` | `/status`, `/tenants`, `/configuration`, `/audit`, `/billing/provider` | `PlatformRuntime` file/memory | Transitional; `postgresApplied: false` | Platform-operator JWT (`requirePlatformOperator`) | Exists in backend; not a product UI | Display probe results if returned | Do not invent a second admin app |
| Workspace settings | `apps/web/src/components/Settings.tsx` | Studio nav `settings`; `setView('settings')` | AppContext `updateWorkspaceProfile` / `updateWorkspaceBranding` / `simulateTier`; also `fetchSettings` / `updateSetting` / workspace-members HTTP | AppContext local; HTTP settings are not shop SoT | LOCAL WORKSPACE + unmounted HTTP probe | Profile/branding/tier simulation yes; HTTP members/settings fail closed | Host; do not remount HTTP as authority | Frame only |
| FeatureGate | experience + `tierEnforcement` | UX overlay | `featureAccess` from AppContext / `simulateTier` | Local simulation | UI PREFERENCE / OPERATIONAL presentation | Yes, UX-only | Display | Do not convert to server entitlements |
| Brand | `apps/web/src/config/brand.ts` | Footer / identity copy | Constant `parentName: AGBOFA Technology Ltd` | Source | DISPLAY | Yes | Display | Do not invent products |
| ADR-007 lock | `apps/web/src/domain/ownership.ts` | Capability `agbofa-control-center` | Ownership table | Code | PLATFORM / unassignable | Lock is real | Display the lock | Do not assign |
| Inspector / command | `StudioShell` | Existing | AppContext | Local | DISPLAY / navigation | Yes | Leave | Quieted on control plane |

No `/shop` admin UI was opened. No second router. No competing configuration store.

## B. Classification

| Control | Class | Mutation in F10 |
|---|---|---|
| Workspace name, id, currency, operator | DISPLAY ONLY (identity) | None on Control Center; existing Settings mutates profile |
| Connectivity / outbox pending | DISPLAY ONLY | None. Labels: Local / Queued / Offline. Never Synced |
| Pattern Engine, Production Assistant, measurement vocabulary | DOMAIN / SECURITY of engines | Display only. No switch |
| Design Studio host / SAC-1 finalize | DOMAIN | Display only. Finalize stays inside DesignStudio |
| FeatureGate branded export / PDF / analytics | UI PREFERENCE (presentation) | Display on Control Center; mutation remains `simulateTier` in Settings |
| Plan simulation | UI PREFERENCE | Not moved; remains Settings |
| Workspace members HTTP | TENANT / unmounted | Not remounted. Not a Control Center editor |
| `/control/status\|tenants\|configuration\|audit\|billing/provider` | PLATFORM probe | Optional probe under Platform section. Empty is empty |
| `/control` JSON `plane: AGBOFA_PLATFORM_CONTROL_CENTER` | API self-label | Shown only as returned payload fields. Not a claim that the platform product exists |
| Tenant list / configuration patch | PLATFORM / TENANT | Not exposed as workspace switches. Probe after operator login only |
| Billing provider | COMMERCIAL / PLATFORM | Display of deferred port if probe returns. No PSP |
| Live billing / entitlements | COMMERCIAL / SECURITY | Not implemented |
| AGBOFA Platform Control Center application | PLATFORM | **Does not exist** (ADR-007). Honest copy only |

## C. AGBOFA boundary

```
AGBOFA PLATFORM CONTROL CENTER     ← future; ADR-007 LOCKED; not in this repository
────────────────────────────────── PLATFORM BOUNDARY ──
STITCHFLOW SYSTEM
  Digital Atelier (rooms)          ← garment work
  Operator plane (this stage)      ← workspace operations + honest governance visibility
```

Acceptable language used in runtime: “Central platform controls are not connected in this runtime.” “Platform governance is managed outside this workspace.” “Do not treat a probe as a connection.”

Forbidden language not used: Connected, Managed, Synced, Platform protected.

## D. Hard-coded values masquerading as configuration

| Value | Reality |
|---|---|
| FeatureGate allow-list | UX presentation from local tier simulation |
| `BRAND.parentName` | Display identity, not a live org graph |
| Backend `/control/status` plane string | API label, not a running AGBOFA product |
| Settings default currency fallback `GHS` | Existing Settings behaviour; Control Center displays recorded currency or “Currency not recorded” |
