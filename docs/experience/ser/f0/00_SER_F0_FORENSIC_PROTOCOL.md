# SER-F0 forensic protocol

**AUDIT MODE: READ ONLY**  
**APPLICATION CODE MODIFIED: NO**  
**BACKEND CODE MODIFIED: NO**  
**CSS MODIFIED: NO**  
**PROTECTED ASSETS MODIFIED: NO**  
**DATABASE MODIFIED: NO**

## Baseline

| Field | Value |
|---|---|
| Branch | `arena/01a05677-stitch-flow` |
| HEAD | `0d49f8b40d935eb90812a624ccd70d9925abaa42` (SAC-5 docs) |
| Remote | `https://github.com/agbofatech-lgtm/stitch-flow.git` |
| Node | v22.22.3 |
| npm | 10.9.8 |
| Frontend start | `npm run dev:web` → Vite `apps/web` |
| Backend start | `npm run dev:backend` → `apps/backend/src/server.ts` PORT 5000 |
| Product port | Vite **5173** (already occupied this session) |
| This audit also booted | Vite **5174** (stopped after HTML fetch) |
| Env to boot web | none required |
| Env for live Control Center / `/shop` | backend `JWT_SECRET`; postgres only if `SHOP_DATABASE_MODE=postgres` |

Unrelated dirt left untouched: `WorkflowContext.tsx`, lockfiles, nested `stitch-flow/`.

## Evidence grades used throughout

| Grade | Meaning |
|---|---|
| SOURCE-EVIDENCED | Read from product source under `apps/web/src` |
| RUNTIME-EVIDENCED | HTTP fetch of running Vite HTML |
| NOT VERIFIED | No pixel/screenshot/browser-interaction lab |
| INHERITED | Known from SAC/PEX continuity; not re-scored |

## Runtime visual verification

**RUNTIME VISUAL VERIFICATION: HTML BOOT ONLY — NO SCREENSHOT LAB**

Fetched:

- `http://127.0.0.1:5173/` → 200, title `StitchFlow Digital Atelier`
- `http://127.0.0.1:5174/` → 200, same title
- `http://127.0.0.1:5174/experience-preview.html` → 200, title `StitchFlow Experience Foundation`

No screenshots. No visual scores. No claim that tokens “look premium” on a device.

## Three truths

CODE TRUTH ≠ RUNTIME TRUTH ≠ EXPERIENCE TRUTH

A token file, a Workroom wrapper, or a Framer Motion import does not prove the owner experiences a cinematic atelier.
