# T5 Forensic Baseline

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| T4 checkpoint | `transformation-t4-experience-foundation-complete` → `f110a9cde3ab2943a510016b6081398b721d6bbb` |

FACT: no React Router. Navigation is AppContext `currentView`. T5 keeps that contract.

FACT: previous chrome was `Layout.tsx` sidebar-of-pages. T5 replaces the shell, does not delete Layout.

FACT: Design Studio remains `components/DesignStudio.tsx` and is hosted, not rewritten.
