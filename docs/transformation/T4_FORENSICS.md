# T4 Pre-Implementation Forensics

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Stage | T4 — Experience Foundation |
| T3 checkpoint | `transformation-t3-domain-boundary-isolation-complete` → `874a03a1510ebd5b6baf66032138bcf6768f35b2` |

## FACT — what exists

| Concern | Finding |
|---|---|
| CSS | `apps/web/src/index.css` is three Tailwind directives only |
| Tailwind | v3.4.19, `theme.extend` empty. `@tailwindcss/vite` v4 is a dependency **unused** by `vite.config.ts` |
| Tokens | Informal `BRAND.colors` in `config/brand.ts` (`#0F6E8C` primary). Not wired to Tailwind |
| Typography | Google font Inter 400–700 in `index.html`. No type scale |
| Component library | **No shadcn.** Only `components/ui/EmptyState.tsx` (indigo, not brand) |
| Layout | `Layout.tsx` sidebar + mobile drawer. Not a Studio shell |
| Navigation | In-memory `currentView` in AppContext. **No router** |
| Motion | framer-motion page fade in Layout; no tokenized durations |
| Icons | lucide-react |
| Utilities | clsx, tailwind-merge present, unused as a system |
| Theme | Light only. No `prefers-color-scheme` handling |
| A11y | Partial (`aria-label` on menu). No focus ring token. `user-scalable=no` on viewport |
| Dark mode | Absent |
| Command/table primitives | Absent as shared system; screens own their tables |

## Classification

| Asset | Class | Note |
|---|---|---|
| `BRAND.colors` / Inter / lucide / framer-motion / clsx / tailwind-merge | PRESERVE | Become token sources |
| `Layout.tsx` | ADAPT later (T5) | Product chrome; do not replace in T4 |
| `components/ui/EmptyState.tsx` | ADAPT | Indigo SaaS leftover; leave file, new experience EmptyState is canonical |
| Screen files (Dashboard, Orders, …) | PRESERVE in T4 | Do not restyle |
| `DesignStudio.tsx` | PROTECTED | Do not edit |
| `*.bak*` | RETIRE later | Not deleted in T4 |
| shadcn | ABSENT | Do not invent a fake shadcn install |

## T4 decision

Add `apps/web/src/experience/` as the Experience layer. Product screens keep existing classNames. Tokens load globally as CSS variables **without** remapping slate/indigo utilities used by current screens.
