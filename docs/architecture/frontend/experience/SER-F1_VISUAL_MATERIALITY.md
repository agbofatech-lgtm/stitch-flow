# Visual materiality

Depth is for focus. Material is paper, cloth, ink, metal needle — **referenced**, not illustrated as clip-art.

## Permitted depth

- Layered surfaces: canvas < workroom < panel < floating < overlay
- Token shadows (`sf-sm/md/lg`)
- One atmospheric wash on the atelier plane (existing `.sf-atelier-atmosphere` is a candidate to **adapt**, not multiply)
- Edge: token borders, not neon outlines
- Canvas emphasis: the work surface is lighter/quieter than chrome
- Translucency **only** if text contrast holds (overlay dim, not frosted forms)

## Prohibits

Excessive glassmorphism; decorative grain/noise; glow; unreadable contrast; visual clutter; animation of lighting; gaming HUD; dark atelier as default; TailorPro blue.

## Preview extraction (F0 island)

| Concept in `experience-preview.html` | Class | How it enters the product |
|---|---|---|
| Token surfaces / type / buttons / fields | **KEEP** | F2 applies inside rooms, not only chrome |
| Dialog, command, empty/error/loading | **KEEP** | Replace local modals |
| Canvas + inspector split | **ADAPT** | Already in StudioShell; make inspector task-true |
| Dark theme toggle | **ADAPT** | Control plane only — not an atelier fashion toggle |
| “Beauty × Function” museum, T4 breadcrumbs | **REJECT** | Not product copy |
| Primitive gallery as a destination | **REJECT** | Product rooms are the source of truth |
| Workroom interiors of Clients/Production/Reports | **REBUILD** | Meet workroom standard; do not paste preview cards |

**Do not promote the preview page into navigation.** Successful concepts move **into rooms**. After F2+, the preview may remain a **dev gallery**, never the proof of experience.
