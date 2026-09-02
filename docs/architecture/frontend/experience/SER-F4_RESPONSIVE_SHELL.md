# SER-F4 responsive shell

F1 constitution: rail → drawer, inspector → sheet, studio host → full bleed.

| Viewport | Behavior | Evidence |
|---|---|---|
| 1280×800 | Rail + workspace + inspector toggle + status | `lab/floor-1280.png` and room shots |
| 768×800 | Rail hidden; hamburger; next action remains | `lab/floor-768.png` |
| 390×844 | Top identity, drawer nav, full-width canvas, next action in context strip | `lab/floor-390.png`, `lab/floor-390-nav.png` |

## Touch

- Rail items: `min-h-11` (was `min-h-10`) + `sf-micro-press`
- Icon buttons: already 44×44 (`h-11 w-11`)
- Place next actions and Operator plane: `Button` size `md` (`min-h-11`)
- Command palette input and rows: `min-h-11`
- Mobile workspace tabs: `min-h-12`

## Inspector

Desktop: `InspectorPanel` from 1280. Below `xl`: `Sheet` titled Inspector. Unchanged F2/F3 overlay motion.

## Not done in F4

Room interiors are not restyled for mobile. That is F5 / F11. The **shell** is the F4 surface.
