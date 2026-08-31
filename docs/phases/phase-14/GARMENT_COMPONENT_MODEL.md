# Garment Component Model

**FACT:** No component graph is persisted.

Evidence-supported “components” are **engine kinds** and **heuristic cutting-piece names**, not selectable construction units.

| Engine kind | What the engine drafts | UI garments that map here |
|---|---|---|
| bodice | Bodice block | bodice, dress, gown, blouse, custom, unknown default |
| shirt | Shirt body + sleeve guide | shirt, senator |
| trouser | Trouser front | trouser |
| skirt | Skirt block | skirt |
| kaftan | Kaftan draft | kaftan, agbada |

**FACT:** Dress/gown do **not** compile a skirt block plus bodice block. They use **bodice** engine kind. SkirtLength on dress is a Studio **UI** field and a garment-length measurement — not a second engine invocation.

**FACT:** Sleeve/collar as `PatternType` values load as garment `custom` in Studio. They do not invoke a sleeve or collar engine (none exists).

**UNKNOWN:** Whether a dress should require both bodice and skirt **components** for specification completeness. No domain rule exists. Inventing one would be STOP-P14-F.

**PROPOSAL:** Keep components UNKNOWN until an evidenced registry is authorized. Do not infer sleeve presence from canvas outline.
