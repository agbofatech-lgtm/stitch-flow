# P9 — Premium Product Gap Matrix

| Area | Current | Evidence | Quality /100 | Problem | Impact | Pri | Direction | Protected? | Risk |
|---|---|---|---|---|---|---|---|---|---|
| Shell | StudioShell tokens | StudioShell.tsx | 62 | Atelier names on SaaS pages | Identity | P1 | Keep shell; restyle rooms | Shell TRANSITIONAL | Med |
| Screens | slate CRUD | Dashboard/Orders/… | 38 | Dual visual language | Identity | P0 | Migrate to primitives **without** engines | Screens REPLACEABLE | Med |
| DesignStudio chrome | teal hero + slate | DesignStudio.tsx | 55 | Inconsistent with shell; dense | Craft | P1 | Theme **around** Studio; do not rewrite engine | **PROTECTED** | High |
| Tokens | --sf-* | tokens.css | 70 | Unused by most screens | System | P0 | Adopt tokens in replaceable UI | Tokens TRANSITIONAL | Low |
| Typography | Inter only | index.html | 40 | No display face | Luxury | P1 | Owner: Satoshi/Grotesk? | No | Low |
| Imagery | logos + soft SVG | shared/assets | 25 | No garment photography program | Fashion | P1 | Optional mood, not SoT | Assets TRANSITIONAL | Low |
| Motion | presets unused | motion.ts | 45 | Splash ≠ rooms | Cinema | P2 | Apply panel/modal only | No | Low |
| Control Center UI | none | no /control in web | 8 | Ops in Settings confusion | Ops | P0 | New plane, not Settings | Commercial API PROTECTED-ish | Med |
| FeatureGate | UX_ONLY | FeatureGate.tsx | 35 | Looks like law | Trust | P1 | Visual only; server remains law | UX TRANSITIONAL | High if confused |
| A11y zoom | user-scalable=no | index.html | 25 | Blocks zoom | Quality | P0 | Allow scale | No | Low |
| theme-color | indigo | index.html | 20 | Off-brand | Polish | P2 | Teal | No | Low |
| Unused Layout | dead shell | Layout.tsx unused | 20 | Dual nav mental model in repo | Hygiene | P2 | Do not resurrect as product | REPLACEABLE | Low |
| Canvas size | 620×500 fixed | DesignStudio | 40 | Mobile clip | Fit Lab | P1 | CSS around canvas; not engine | Presentation vs engine | Med |
| Dark tokens | unused | tokens.css | 30 | Incomplete | Cinema | P3 | Optional later | No | Low |
| Offline UX | badge only | StudioShell footer | 40 | No commercial offline story | P19 | P1 | Do not invent grant | Commercial UNKNOWN | High |
