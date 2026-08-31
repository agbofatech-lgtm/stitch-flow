# Phase 17 — AI Inventory (FACT)

Date: 2026-08-31  
Predecessor: `transformation-phase-16-trusted-deterministic-execution-complete` → `623addb5dad9056130925d6c0b95b0fd3992c48e`

| Question | Finding | Class |
|---|---|---|
| OpenAI SDK / API | **ABSENT** in package.json, source, `.env.example` | FACT |
| Gemini SDK / API | **ABSENT** | FACT |
| Claude / Anthropic SDK | **ABSENT** | FACT |
| AI env vars | **ABSENT** (`OPENAI_*` etc. not declared) | FACT |
| Prompt templates | **ABSENT** before Phase 17 | FACT |
| LLM agents | **ABSENT** | FACT |
| “Use AI Suggestion” | Design Studio → `inferGarmentTypeFromInspiration` keyword heuristic | FACT / ADR-004 |
| productionAssistant “recommendation” | Fit-risk heuristic strings | FACT — not an LLM |
| ADR-004 | AI may advise; must not silently become authority | FACT |

**UNKNOWN:** which commercial model an operator will inject via `LanguageModelPort`. Not inferred.
