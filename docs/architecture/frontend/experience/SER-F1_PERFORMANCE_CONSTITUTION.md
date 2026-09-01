# Performance constitution

Cinematic without jank.

| Rule | Principle |
|---|---|
| Startup | Splash ≤ constitution arrival; do not block on T2 failure (today T2 is fire-and-forget — keep that honesty) |
| Code splitting | Host Design Studio as a lazy child **without editing internals**; split workrooms |
| Animation cost | Transform/opacity only; no layout-thrash blur on every frame |
| Canvas isolation | Protected Studio stays a child; frame must not re-render it from shell noise |
| Images / fonts | System fallbacks if Google Fonts fail; no extra font families |
| Effects | One atmosphere; no stacked filters |
| React | Do not widen AppContext further as the motion bus |
| Bundle | Treat ~1MB main as **debt**, not a budget. F13 measures a new budget; F1 does not invent a fake kB score |
| Memory | No unbounded toast/history |

**Prohibits:** adding motion libraries beyond existing Framer Motion without F13 evidence; preview-island in the main product graph as a required load.
