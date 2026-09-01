# P7 — Accessibility & Responsiveness Audit

## Accessibility (FACT)

- `index.html` `user-scalable=no` — **blocks pinch zoom** (anti-premium a11y).
- Experience primitives: IconButton `aria-label`, Dialog/Sheet, focus ring.
- StudioShell: nav `aria-label`, `aria-current`, overlay close label, sr-only collapsed labels.
- DesignStudio: many unlabeled icon buttons (`title=` only); range inputs without `aria`.
- EmptyState indigo buttons not using experience Button.
- Contrast: teal on white generally OK; white/15 on teal hero depends on display. **NOT measured in lab.**
- Screen reader: no product-wide live region. Workflow errors use `role="alert"` in WorkflowPanel.

## Responsive

- Mobile bottom nav 6 items at 10px type — cramped.
- Inspector Sheet < xl.
- DesignStudio canvas **fixed 620×500** — overflow on small screens (`overflow-auto` wrapper).
- Nested `min-h-screen` inside shell causes double scroll.
- `workspace` breakpoint 1440px defined; little exclusive use.

**Classification:** professional **desktop-first**; tablet/mobile acceptable navigation, compromised canvas.
