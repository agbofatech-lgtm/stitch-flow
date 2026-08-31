# Phase 17 Implementation

Read-only intelligence around Phase 16 trusted execution.

| Piece | Location |
|---|---|
| Contracts / classification / prompts | `domain/intelligence/` |
| Context builder | `buildGovernedIntelligenceContext` |
| Local interpreter (not an LLM) | `structured-interpreter-v1` |
| Provider port | `TailoringIntelligenceProvider` / `LanguageModelPort` |
| Adapters | openai / gemini / claude via injected port only |
| Default | local-governed (offline) |
| Unavailable | advisory off; deterministic execution still runs |

No vendor SDK added. No secrets. No Phase 18. No mutation of frozen authorities.
