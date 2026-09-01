# StitchFlow Experience Constitution

**Stage:** SER-F1 · architecture only · not implemented  
**Central law:** StitchFlow is a **digital atelier**, not an admin dashboard with fashion styling.

ADR-008 remains binding: experience is an acceptance criterion.

Every cinematic, visual, or interaction decision must improve **comprehension, hierarchy, or professional confidence**. Effects that do not do that are prohibited.

## Principles

For each: WHY · WHAT · PERMITS · PROHIBITS · VERIFY

### A. Visual identity

**WHY** Craft identity is the product, not a theme overlay.  
**WHAT** One warm-paper atelier world: precision, cloth, light, quiet authority.  
**PERMITS** Tokenized surfaces, display/body/numeric type, atelier vocabulary, restrained atmosphere.  
**PROHIBITS** Generic SaaS dashboard look, TailorPro/slate leftovers, glass-for-glass, AI-startup glow, Bootstrap residue, preview-island as the product.  
**VERIFY** Screenshot lab of shell **and** every major room against this constitution (SER-F2+). No score without pixels.

### B. Spatial composition

**WHY** Tailors work in rooms, not pages.  
**WHAT** Hierarchy: StitchFlow → Atelier | Platform → Room → Task canvas → Context tools → Status.  
**PERMITS** Persistent shell, one primary canvas, secondary inspector, overlay for commitment.  
**PROHIBITS** Competing layouts per room; dumping tables into the shell and calling it an atelier.  
**VERIFY** Every room names canvas / tools / context / status. Inspector never becomes the canvas.

### C. Typography

**WHY** Hierarchy is craft.  
**WHAT** Display (Space Grotesk) for room titles; Inter for work; IBM Plex Mono for measurements, order numbers, versions.  
**PERMITS** Token type scale.  
**PROHIBITS** Arbitrary heading sizes, marketing display on forms, mixing numeric data into proportional body without `font-numeric`.  
**VERIFY** Type tokens used; no third font family in product UI.

### D. Color

**WHY** Color is signal, not decoration.  
**WHAT** Warm paper canvas; ink for reading; `#0F6E8C` for action; semantic status only for state.  
**PERMITS** Token surfaces and status. Dark tokens **only** for Control Center plane.  
**PROHIBITS** Hardcoded slate/sky palettes, competing brand blues (`#1e40af` TailorPro), status color as decoration.  
**VERIFY** Product CSS uses tokens; manifest/theme match atelier, not TailorPro.

### E. Surfaces

**WHY** Materials teach where work happens.  
**WHAT** Canvas / workroom / panel / floating / overlay — finite set.  
**PERMITS** Those five.  
**PROHIBITS** New surface languages per screen; glass cards on reports; red-box HTTP errors as a visual system.  
**VERIFY** Room audit: each block maps to a named surface.

### F. Depth

**WHY** Depth creates focus, not drama.  
**WHAT** Layered elevation, quiet shadow, spatial separation of canvas vs chrome.  
**PERMITS** Token elevation; slight atmosphere on the atelier plane.  
**PROHIBITS** Stacked blur, neon, game HUD, unreadable translucency.  
**VERIFY** Contrast of text on every layered surface (F12).

### G. Lighting

**WHY** The floor should feel lit, not textured with noise.  
**WHAT** Soft directional wash (existing atmosphere is a starting point).  
**PERMITS** One restrained canvas wash.  
**PROHIBITS** Multiple competing glows, animated lighting, dark atelier as default.  
**VERIFY** Atmosphere does not reduce body-text contrast.

### H. Motion

**WHY** Motion explains causality.  
**WHAT** Four categories: MICRO, CONTEXTUAL, WORKSPACE, MILESTONE (see cinematic principles).  
**PERMITS** Choreography that shows arrival, selection, commitment, completion.  
**PROHIBITS** Animation for spectacle; ignoring `prefers-reduced-motion`.  
**VERIFY** Reduced-motion path; no motion without a named category.

### I. Interaction

**WHY** Confidence comes from predictable controls.  
**WHAT** Shared Button, Field, Dialog, Command. One modal system.  
**PERMITS** Token primitives; keyboard-first command.  
**PROHIBITS** Per-room modal shells; silent hover-only actions.  
**VERIFY** No new local `*Modal` without the shared Dialog.

### J. Information hierarchy

**WHY** A tailor must know: what am I working on, what can I do, what is the state.  
**WHAT** Kicker → title → context object → primary action → canvas → status.  
**PERMITS** Badges for count/state.  
**PROHIBITS** KPI walls as home; debug strings; JSON as the atelier UI.  
**VERIFY** Five-second comprehension test per room (F15).

### K. Responsiveness

**WHY** The atelier must survive the phone without becoming a shrunk desktop.  
**WHAT** Adaptive: rail → sheet → full-screen; inspector collapses; canvas stays primary.  
**PERMITS** See responsive constitution.  
**PROHIBITS** Hiding primary work; six-icon bars that drop Settings/Control without a path.  
**VERIFY** Viewport lab 320–1920 (F11). F0 did not lab this.

### L. Accessibility

**WHY** Cinematic cannot exclude.  
**WHAT** Focus, semantics, contrast, reduced motion, touch targets, announced status.  
**PERMITS** Motion that respects reduce.  
**PROHIBITS** Focus traps missing on overlays; contrast-breaking glass.  
**VERIFY** F12; no WCAG claim before lab.

### M. Performance

**WHY** Lag destroys premium.  
**WHAT** Cinematic within budget: split Studio host, lazy rooms, cheap motion.  
**PERMITS** Tokens, short transforms.  
**PROHIBITS** Unsplitted 1MB main as a permanent architecture; heavy blur on every frame.  
**VERIFY** Bundle + runtime budgets in performance constitution.

### N. Error handling

**WHY** A failed HTTP call must not be the atelier.  
**WHAT** Honest errors in atelier language. Never instruct users to hit unmounted `/customers`.  
**PERMITS** ErrorState primitive.  
**PROHIBITS** Remounting unauthenticated CRUD to “fix” empty rooms; stack traces in UI.  
**VERIFY** Error copy review; data-honesty checks.

### O. Loading

**WHY** Waiting is part of craft if it is structured.  
**WHAT** Skeleton of the **same spatial layout**, not a generic spinner covering a different page.  
**PERMITS** WorkspaceSkeleton, splash as arrival only.  
**PROHIBITS** Splash on every room change; indeterminate wait without a region.  
**VERIFY** Loading preserves room geometry.

### P. Empty states

**WHY** Empty is the start of work, not a void.  
**WHAT** Explain what to do next; one primary action.  
**PERMITS** ExperienceEmptyState.  
**PROHIBITS** Empty dashboards of zeroed KPIs.  
**VERIFY** Each room has a crafted empty.

### Q. Data confidence

**WHY** Pretty UI over the wrong store is a lie.  
**WHAT** UI must show whether data is local, queued, acknowledged, or unavailable. SAC remains authority.  
**PERMITS** Honest badges.  
**PROHIBITS** Fake sync, FeatureGate as billing, silent trusted overwrites.  
**VERIFY** Data experience rules; SAC tests remain the backend truth.

### R. Professional tailoring vocabulary

**WHY** Words are the world.  
**WHAT** Client, measurement, garment, pattern table, production floor, order, fitting — not “records”, “CRM”, “tickets”.  
**PERMITS** Atelier terms in chrome and rooms.  
**PROHIBITS** “Dashboard” as home; “TailorPro”; “users” for clients.  
**VERIFY** Copy audit of nav, headers, empty/error strings.
