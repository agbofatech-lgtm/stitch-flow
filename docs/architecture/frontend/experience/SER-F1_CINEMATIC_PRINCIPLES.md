# Cinematic principles

Motion is language. If it does not name a change, it is noise.

## Categories

| Category | Job | Typical duration band (tokens, not code yet) |
|---|---|---|
| MICRO | hover, press, focus, selection | instant–fast (~80–140ms) |
| CONTEXTUAL | inspector, sheet, command, dialog | fast–base (~140–220ms) |
| WORKSPACE | room to room | base (~220–280ms) |
| MILESTONE | arrival, trusted finalize, production advance, completion | base–slow (~220–360ms), never looping |

SER-F3 implements tokens. Do not hard-code magic numbers in random components.

## Choreography (intended)

| Event | Principle |
|---|---|
| Entrance | Splash is arrival once per session, then Floor. Shared spatial persist after splash — no second splash on nav. |
| Workspace transition | Cross-fade **plus** retained thread (client/order name). Not a hard cut. Not a 3D fly-through. |
| Contextual | Inspector/sheet slide from the side they occupy. |
| Panel | Enter from their rest edge; do not scale-bounce. |
| Modal | Commitment only (finalize, destructive). Overlay dim; dialog MICRO scale. Escape closes unless commitment is in-flight. |
| Command palette | CONTEXTUAL; keyboard first. |
| Selection | MICRO on the object, not the whole page. |
| Success / finalize | MILESTONE: one clear confirmation of frozen identity (fingerprint visible). No confetti. |
| Production state | Stage change is a MILESTONE of the **stage**, not a board reshuffle animation. Invalid transitions stay refused (SAC). |
| Loading | Skeleton of the same room. |
| Background / ambient | Atmosphere is static or near-static. No drifting particles. |
| Reduced motion | All categories collapse to instant opacity or none. `prefers-reduced-motion` is mandatory. |

## Prohibits

Parallax hero, looping ambient, animation that delays primary input, milestone motion on every keystroke (Path A live generate stays **live**, not a firework).
