# P3 — Visual Identity Audit

## Brand (`config/brand.ts`)

- Product: StitchFlow. Parent: AGBOFA Technology Ltd.
- Primary `#0F6E8C` / `#0C5C74`. Charcoal `#1E2933`. Background `#F8FBFC`.
- Tagline: “Tailoring Business Platform” — **business**, not atelier.
- Typography primary Inter; alternatives Space Grotesk / Satoshi **named but unused**.
- Assets: logos, favicons, soft SVGs (needle, scissors, tape, sewing machine).

## Dual systems (FACT)

| System | Use |
|---|---|
| `--sf-*` tokens + Tailwind `surface/ink/action` | StudioShell, experience primitives, MeasurementWorkspace, WorkflowPanel |
| Hardcoded `#0F6E8C` + `slate-*` / `sky-*` / `indigo-*` | DesignStudio, Dashboard, Orders, Customers, Settings, FeatureGate, EmptyState |

`index.html` `theme-color` is `#1e40af` (indigo) — **not brand teal**.

## Identity scores (0–5)

| Dimension | Score | Evidence |
|---|---|---|
| PREMIUM | 2 | Tokens + splash; screens generic |
| LUXURY | 1 | No material luxury, no photography program |
| CRAFTSMANSHIP | 2 | Splash sewing; canvas guides |
| PRECISION | 3 | Numeric tokens, measurement workspace |
| FASHION | 1 | Lucide icons; user-upload inspiration only |
| TECHNOLOGY | 3 | Canvas, workflow, command menu |
| TRUST | 3 | Authority language in measurements; FeatureGate UX only |
| PROFESSIONALISM | 3 | Dense Studio; inconsistent chrome |

Display and sans both Inter. Dark theme tokens exist (`[data-theme=dark]`) — **not wired** in App.
