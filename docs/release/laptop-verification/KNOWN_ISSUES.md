# Known issues (do not upgrade)

## Blocking for “production SaaS”

None of these block **laptop visual verification** of the atelier UI. They **do** block production commercial claims.

1. PostgreSQL **NOT VERIFIED**; migrations not a production SoT
2. Live PSP **DEFERRED**
3. Web TypeScript inherited FAIL (`materials.ts`, `reports.ts`, `types.ts`)
4. Business CRUD unmounted by default
5. Root README still describes Render/`npm start` as if this were only a backend repo (stale copy)

## Non-blocking / PEX residue

- Screenshot / zoom / screen-reader lab **NOT TESTABLE** in agent environment
- Reports remain card-dense
- Orders/Materials still use local modals (not shared Dialog)
- `Dashboard.tsx` / `Layout.tsx` unused — documented, not deleted
- PWA `manifest.json` still says “TailorPro”; **no service worker**
- Splash is TRANSITIONAL
- CORS `origin: true` (wide)
- Dual headings: shell h1 + room h2
- ~1MB JS main chunk (DesignStudio + html2canvas/jspdf)

## Inherited domain conditions (permanent until owner programmes)

- Hip 98/100/102 unresolved
- Spec ≠ measurement ≠ composition
- Canonical required-component registry empty
- Live OpenAI/Gemini/Claude **NOT YET VERIFIED**
- FeatureGate UX_ONLY
- File JSON IAM TRANSITIONAL
- AppContext localStorage TRANSITIONAL
