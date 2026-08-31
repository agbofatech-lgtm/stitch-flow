# StitchFlow Experience Foundation

| Field | Value |
|---|---|
| Stage | T4 |
| Date | 2026-08-31 |
| Law | ADR-008 — Beauty × Function = Experience |
| Code | `apps/web/src/experience/` |
| Preview | `/experience-preview.html` |

## Philosophy

Every aesthetic decision must improve comprehension, confidence, focus, or action. Isolated decoration is not an Experience System.

T4 is the **foundation**. T5 is the Studio shell. This document does not authorize Command Center, Client Studio, Production Studio, or Business Studio.

## Layering

```
EXPERIENCE  apps/web/src/experience
FEATURE     product screens (unchanged in T4)
DOMAIN      apps/web/src/domain + protected engines
DATA        T2 repositories
```

UI primitives must not contain pattern math, measurement derivation, production calculations, billing, or entitlements.

## Token architecture

CSS variables on `:root` and `[data-theme='dark']` in `tokens.css`, mirrored in `tokens.ts`, mapped into Tailwind as:

- `surface.canvas | workspace | panel | elevated`
- `ink.primary | secondary | muted | inverse`
- `action.primary | hover | secondary`
- `status.success | warning | danger | info`
- `line` / `line-strong`
- `ring-focus`

Product screens still use slate/sky/indigo utilities. T4 does **not** restyle them.

## Principles

- Typography: Inter; numeric tables use tabular figures (`font-numeric`).
- Spacing: `--sf-space-1` … `--sf-space-12`.
- Radius: sm / md / lg / workspace / pill.
- Elevation: semantic shadows, not arbitrary drop-shadows.
- Motion: 80–360ms, `sf-motion-safe` respects `prefers-reduced-motion`.
- Focus: `.sf-focus-ring` visible on `:focus-visible`.
- Responsive: mobile-first layout primitives; inspector stacks under canvas (`SplitPane`).
- Workspace concepts (Context, Tools, Canvas, Inspector, Intelligence) inform layout, not T5 navigation.

## Prohibited patterns

- Domain logic in primitives
- New localStorage from the experience layer
- Copying the old sidebar and calling it Studio
- Hardcoded commercial prices in UI tokens
- Replacing Design Studio
