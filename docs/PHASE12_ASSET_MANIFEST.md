# Phase 12 — Public Experience Asset Manifest

All presentation assets are local. No image, font, or animation CDN is referenced
anywhere in the public experience (verified: cold-load request hosts = preview
origin only).

| Asset | Format | Dims | Size | Usage | Local |
|---|---|---|---|---|---|
| `public/images/public/brand/stitchflow-logo-128.webp` | WebP | 128×128 | 2.4 KB | Public header / footer mark (webp source) | yes |
| `public/images/public/brand/stitchflow-logo-256.webp` | WebP | 256×256 | 5.0 KB | Hero brand reveal (webp source) | yes |
| `public/images/public/brand/stitchflow-logo-128.png` | PNG | 128×128 | 16 KB | `<picture>` fallback for header/footer | yes |
| `public/images/public/brand/stitchflow-logo-256.png` | PNG | 256×256 | 49 KB | `<picture>` fallback for hero | yes |
| `src/shared/assets/stitchflow-logo.png` | PNG | 1200×1200 | 248 KB | Original brand asset — unchanged; NOT shipped to the landing (app icons/auth only) | yes |
| Geist / Hanken Grotesk / JetBrains Mono | WOFF2 (variable) | n/a | 29/34/40 KB | Local `@fontsource-variable`, precached by PWA | yes |
| Hero ambient grid | CSS gradients | n/a | 0 B | Inline styles, no asset | yes |
| Stage illustrations (5) | Inline SVG | 320×240 viewBox | ~1–2 KB each | Measure/Design/Pattern/Produce/Manage technical diagrams | yes |
| Workflow spine / CTA gradient | CSS gradient | n/a | 0 B | Tailwind gradient utilities on tokens | yes |
| `public/icons/icon-192/512.png` | PNG | 192/512 | existing | PWA + `og:image` social preview | yes |

Derivatives were generated from the existing logo bitmap via Chromium canvas
encode (same artwork, no redesign); originals remain the source of truth for
icons and in-app branding.

Performance (methodology: Chromium 149 headless-shell via puppeteer-core,
1440×900, `Network.setCacheDisabled=true`, LAN-local preview server, no CPU
throttle, 2026-08-29): cold LCP 192 ms, CLS 0.000, longtask total 0 ms
(TBT proxy), single origin, entry chunk 335 KB uncompressed after the Phase 12
lazy split (was 1191 KB).
