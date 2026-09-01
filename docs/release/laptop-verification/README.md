# StitchFlow — Owner laptop verification

This package prepares the **current** repository for independent owner inspection. It does not certify 3D, live billing, Postgres, or a new API platform.

**Branch:** `arena/01a05677-stitch-flow`  
**Predecessor HEAD (P9/P10):** `0525ef2f55dde07192edeea2daa7530a77daffa2`  
**Preparation package:** `49a1920c61523d3223f2dd896cd878954c3b83ae`

## Exact sequence

1. Clone `https://github.com/agbofatech-lgtm/stitch-flow.git`
2. `git checkout arena/01a05677-stitch-flow`
3. `git pull origin arena/01a05677-stitch-flow`
4. Node 20+ and npm. From repo root: `npm install`
5. `cp .env.example .env` (placeholders only — replace secrets locally; never commit `.env`)
6. Start backend: `npm run dev:backend` (listens `0.0.0.0:5000`)
7. Start frontend: `npm run dev:web` (listens `0.0.0.0:5173`)
8. Tests: see `VERIFICATION_COMMANDS.md` (there is **no** root `npm test` that runs every suite)
9. Production build: `npm run build` (workspaces: backend `tsc` + web `vite build`)
10. Open `http://localhost:5173`
11. Verify main app rooms (Home, Customers, Measurements, Design Studio frame, Orders, Production, Materials, Invoices, Reports, Settings)
12. Verify Design Studio **as hosted** — do not expect internals to have been rewritten
13. Verify Control Center (operator sign-in; tenant Settings is a different plane)
14. Verify commercial **simulation** in Settings + `/control/billing/provider` (live PSP deferred)
15. Resize the browser (phone / tablet / laptop / desktop)
16. Offline: T2 queue is implemented; **no service worker** — do not expect full PWA offline
17. Read `KNOWN_ISSUES.md`
18. Run the commands in `VERIFICATION_COMMANDS.md`

Details: `LAPTOP_SETUP.md`, checklists in this folder, `PRE_LAPTOP_RELEASE_READINESS_REPORT.md`.
