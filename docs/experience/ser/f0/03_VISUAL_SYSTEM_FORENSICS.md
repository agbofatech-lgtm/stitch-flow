# Visual system forensics

## Intended system (SOURCE)

`experience/tokens/tokens.css` + Tailwind map in `tailwind.config.js`:

- Canvas warm paper `#f3efe6` (not BRAND.background `#F8FBFC`)
- Action `#0f6e8c` (matches `BRAND.colors.primary`)
- Display Space Grotesk · body Inter · numeric IBM Plex Mono (`index.html` Google Fonts)
- Radius/elevation/duration tokens exist
- Atmosphere: `.sf-atelier-atmosphere` dual radial wash on AtelierShell
- Dark tokens on `[data-theme='dark']`

## Actual runtime system (SOURCE + HTML boot)

Product `body` uses token canvas/ink. `AtelierShell` applies atmosphere for atelier plane; Control Center sets `data-theme=dark`.

Product App **does not** expose a light/dark toggle. Preview HTML does.

Google Fonts are a network dependency (CONDITIONAL if offline).

## Legacy residue (SOURCE)

Competing palettes still in mounted screens:

| Era | Evidence |
|---|---|
| Token atelier | AtelierHome, MeasurementWorkspace chrome, Settings header, StudioShell |
| HTTP workroom + error red boxes | ProductionBoard `bg-red-50` / `border-red-200` |
| Dense metric cards | Reports `MetricCard` grid (dashboard grammar) |
| Brand constants | `BRAND.colors.background #F8FBFC` unused by tokens |
| PWA manifest | `TailorPro`, `theme_color #1e40af`, `background_color #f8fafc` — **slate SaaS, not atelier** |
| Nested tree | `stitch-flow/` still glass/slate; **not product runtime** |

## Typography

Hierarchy exists as Tailwind `text-display` / `text-heading-*` / `text-body` / `text-meta` / `font-numeric`.  
Design Studio internals (protected) retain their own canvas typography — NOT VERIFIED visually, SOURCE: 4000-line mixed file.

## Spacing / density

Token scale `--sf-space-1…16` exists. Workrooms still mix `p-4 lg:p-8`, `gap-4`, arbitrary `tracking-[0.16em]`. Reports remain card-dense (PEX residue, continuity pack).

## Surfaces

| Material | Where |
|---|---|
| Atmosphere canvas | AtelierShell |
| Workroom | most shop screens |
| Panel | Atelier Home, inspector |
| Token Dialog | Customers, Design Studio trusted finalize |
| Local overlay modals | Orders, Materials, Invoices |
| Protected canvas | DesignStudio interior |
| Dark control plane | Control Center |

## Icons

Lucide only in product shell. Stroke `h-4 w-4` in nav. Functional, not a custom atelier set.

## Verdict

**INTENDED:** warm-paper digital atelier.  
**ACTUAL CHROME:** tokenized shell is real and mounted.  
**ACTUAL INTERIOR:** multiple eras. Owner sees a coherent *frame* around *incoherent rooms*, plus a PWA name that still says TailorPro.
