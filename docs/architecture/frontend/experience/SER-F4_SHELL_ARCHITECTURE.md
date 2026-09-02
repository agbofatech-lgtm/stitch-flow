# SER-F4 shell architecture

**Runtime:** `main.tsx` → `AppProvider` → Splash → `StudioShell` → `AtelierShell`  
**Navigation authority:** `AppContext.currentView` plus the existing measurements seam (`registerAtelierRoomHandler` / `goAtelierRoom`). No React Router.

## Five layers (implemented, not a new layout kit)

| Layer | Where | What the user sees |
|---|---|---|
| 1. Atelier identity | `WorkspaceHeader` kicker/title + rail brand | Place name from `ATELIER_PLACES` (Floor, Client room, …) |
| 2. Spatial navigation | `AtelierNavigation` + mobile drawer + 6-room tab bar | Rooms / Ledger / Workspace / Operator |
| 3. Work context | Persistent strip (`AtelierThread`) + place next action | Client / order from `selectedOrderId`, or “No client selected” |
| 4. Workspace | Existing room hosts inside `WorkspaceCanvas` | Rooms are **not** rebuilt in F4 |
| 5. Status / confidence | `StatusBar` + `AtelierConfidence` | Local / queued / offline. Probe toast never says “Synced” |

`AtelierShell` now exposes `data-atelier-place={place.id}` and existing `data-plane`. Control Center sets `plane="control"` (darker operator plane of the same building).

## Place grammar

Canonical table: [`atelierGrammar.ts`](../../../../apps/web/src/studio/atelierGrammar.ts).

Next actions **only navigate** (`goTo` / overlay exit). They do not save, sync, bill, or invent workflows.

## What F4 is not

- Not a room rebuild (F5+).
- Not a Design Studio rewrite (host frame only).
- Not a data-authority change (AppContext remains UI SoT; SAC untouched).
