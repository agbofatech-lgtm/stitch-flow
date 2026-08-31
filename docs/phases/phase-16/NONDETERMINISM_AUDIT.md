# Nondeterminism Audit

| Source | Location | Identity impact |
|---|---|---|
| `new Date()` / `generatedAt` | productionAssistant | T10 already strips from normalized output **FACT** |
| UUID / `crypto.randomUUID` | version freeze ids | Must stay out of fingerprints |
| `Math.random` | id fallbacks | metadata only |
| Object key order | mitigated by T10 `canonicalize` | **FACT** |
| Engine internal defaults | patternEngine / productionAssistant | Applied **inside** protected files when keys missing **FACT** |
| locale/timezone | not observed in engine geometry **INFERENCE** | — |
| live AppContext | UI | must not enter trusted path |

**STOP-P16-G:** fingerprints must exclude runtime timestamps and random ids.
