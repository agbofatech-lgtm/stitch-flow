# Responsive constitution

Desktop is not shrunk into mobile. Each class **transforms**.

| Class | Remains | Collapses | Transforms | Touch |
|---|---|---|---|---|
| Desktop ≥1440 | Rail + inspector + canvas | — | Full atelier | Pointer |
| Laptop 1024–1439 | Rail + canvas | Inspector default closed; toggle sheet | — | Pointer |
| Tablet 768–1023 | Compact rail or top bar | Inspector → sheet | Command still Ctrl/K or button | Mixed |
| Mobile portrait <768 | Canvas + bottom stations | Rail → drawer; inspector → full-screen sheet | Primary action in header | Touch-first 44px |
| Mobile landscape | Canvas width | Chrome thinner | Studio host full-bleed | Touch |

**Sheets / drawers / full-screen**

- Navigation: drawer on small
- Inspector: sheet
- Dialog: near-full-screen on small, still shared Dialog
- Design Studio host: full-screen canvas; frame chrome compresses; internals untouched
- Control Center: full-screen plane, not a cramped dark widget

F0 did not lab pixels. F11 must.
