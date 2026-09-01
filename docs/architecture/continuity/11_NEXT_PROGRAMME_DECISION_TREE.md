# 11 — Next Programme Decision Tree

**Date:** 2026-09-01  
**This document does not start a programme and does not recommend one.**

Architecture dependency order matters. Exciting is not a precondition.

---

## A — Live Studio → trusted deterministic execution convergence

Close T10 C1: Design Studio would call governed execute (Path C) instead of T7 identity re-exports.

| | |
|---|---|
| Preconditions | Owner authorizes C1 closure; golden fixtures still green; protected hashes unchanged |
| Dependencies | T10, P13–P16, T7 adapters remain; MeasurementVersion freeze UX |
| Protected assets | Pattern Engine, Production Assistant, Design Studio — wrap only, no formula rewrite |
| Risks | Silent measurement-separation drift vs current Studio aliases; hip default paths; canvas still UNKNOWN px/cm |
| STOP | Any engine byte change; fixture mismatch; dual geometry; AI writing measurements |
| Must not assume | That Path C is already live; that Studio freeze equals MeasurementVersion |

---

## B — Shop data authority migration (AppContext/localStorage → T2)

| | |
|---|---|
| Preconditions | Owner authorizes dual-read then cutover; T2 conflict policies for measurement/order/production already exist (T3) |
| Dependencies | T2 runtime, legacyAdapter map, no new localStorage domain keys |
| Protected assets | Do not store engine formulas; drafts key retirement needs ADR |
| Risks | Dual SoT during migration; data loss; two customer populations collapsing incorrectly |
| STOP | Deleting localStorage before dual-read proof; using last-write-wins globally |
| Must not assume | T2 is already SoT because it starts in `main.tsx` |

---

## C — Authenticated business API programme

| | |
|---|---|
| Preconditions | Owner auth decision (T1 STOP D); identity plane (P19) exists; **do not** set `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true` as the solution |
| Dependencies | P19 JWT; tenant context; schema for shop tables; contract-first payloads (ADR-010) |
| Protected assets | `productionStageService` rules preserved; do not invent stage codes |
| Risks | Exposing unauthenticated CRUD; payload mismatch; mounting flag as “security” |
| STOP | Public unauthenticated `/customers` `/orders`; treating shop payments as SaaS billing |
| Must not assume | Frontend already calling `/customers` means the API is live |

---

## D — Postgres platform persistence programme

| | |
|---|---|
| Preconditions | Owner authorizes leaving file JSON; apply/adapt `006`; real migrate runner |
| Dependencies | P19 store snapshot version; tenant ≠ workspace invariants |
| Protected assets | None of the tailoring engines live in Postgres today — keep it that way unless a later ADR says otherwise |
| Risks | Treating empty 002–005 as schema; mixing shop `initDb` tables with `platform_*` |
| STOP | Silent “migrate” that drops file store; claiming RLS that does not exist |
| Must not assume | `/ready` postgres not-verified is a lie — it is honest |

---

## E — Pre-production hardening

| | |
|---|---|
| Preconditions | Owner names the launch target; rebuild `dist` from current `src` or stop using `npm start` |
| Dependencies | G23 dist drift; CORS; JWT secret; no HTTP admin grant; web tsc; Helmet |
| Protected assets | Hash freeze |
| Risks | Hardening the stale dist; pentest claims |
| STOP | Claiming PCI/pentest; enabling a PSP as a side effect |
| Must not assume | Backend tsc PASS implies production image matches `src` |

---

## F — API & integration platform preparation

| | |
|---|---|
| Preconditions | Trusted tailoring authority stable; contracts exist; shop SoT decided |
| Dependencies | ADR-010; document 09 route matrix; do not revive `apps/api` as a second authority |
| Protected assets | Engines stay server-side-wrapped or client-governed — no second pattern engine over HTTP |
| Risks | `/api/v1` folklore; public pattern API without auth |
| STOP | Second backend folder as competing authority (ADR-009) |
| Must not assume | `docs/api.md` is the live contract |

---

## G — 3D foundation

| | |
|---|---|
| Preconditions | ADR-005: 3D is a **downstream consumer** of trusted tailoring. Path C should be the exclusive geometry authority first (programme A) |
| Dependencies | Frozen measurement + spec + pattern output; not canvas silhouettes |
| Protected assets | 3D must not become measurement or pattern authority |
| Risks | Visual demo driving domain truth |
| STOP | Three.js/glTF as SoT; beginning 3D because it is compelling |
| Must not assume | Design Studio canvas is pattern geometry |

---

No programme is selected here. Await explicit owner authorization after this pack is reviewed.
