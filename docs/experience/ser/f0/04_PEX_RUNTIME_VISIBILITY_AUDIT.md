# PEX runtime visibility audit

Why “redesign complete” could fail to convince the owner: the strongest PEX object is **not the product**, and the product’s most-used interiors still look like HTTP tables, error walls, or the untouched Studio canvas.

Classification: **A** dominant · **B** present but subtle · **C** obscured · **D** unreachable · **E** dead

| Feature | Code exists | Mounted | Visually dominant | Owner likely notices | Class |
|---|---|---|---|---|---|
| Token CSS + Inter/Grotesk/Plex | yes | product CSS | if fonts load | maybe (subtle vs canvas) | **B** |
| AtelierShell + atmosphere | yes | yes | frame yes | yes, as “new chrome” | **A** |
| AtelierNavigation + logo | yes | yes | yes | yes | **A** |
| WorkspaceHeader kicker/title | yes | yes | yes | yes | **A** |
| Command palette Ctrl/K | yes | yes | only if invoked | maybe | **B** |
| Inspector / workflow rail | yes | default ≥1280 | side, not journey | maybe on desktop | **B/C** |
| StatusBar T2 badge | yes | yes | small | easy to miss | **B** |
| Splash logo spin | yes | always | 0.7–1.6s | yes once per load | **A** then gone |
| Atelier Home workroom | yes | command | yes in that room | yes | **A** |
| Workroom/PageHeader wrappers | yes | most rooms | header only | “same old screen with new title” | **C** |
| Shared Dialog | yes | Customers, SAC-1 dialog | local | mixed | **B** |
| ExperienceEmptyState/ErrorState | yes | HTTP rooms | **error may dominate** | yes, as failure | **A (negative)** |
| Motion presets 220ms panel | yes | workspace switch | subtle | easy to miss | **B** |
| Dark theme tokens | yes | Control Center only | when operator logs in | Control ≠ atelier | **C** |
| Experience Foundation preview | yes | **other HTML** | **only if URL known** | **no** | **D** |
| Layout.tsx / Dashboard.tsx | yes | no | no | no | **E** |
| DesignStudioFrame badges | yes | design workspace | thin strip | “hosted — not rewritten” copy | **B** |
| Design Studio internals | yes | yes | **overwhelms frame** | yes as old studio | **C** (frame) |
| FeatureGate | yes | materials/reports | when locked | lock card | **B** |
| PWA manifest TailorPro | yes | if installed | contradicts atelier | if they install | **A (wrong brand)** |
| Reduced motion path | yes | splash + motionOrInstant | if OS setting | unknown | **B** |

## Gap explanation (the important paragraph)

PEX rebuilt **chrome and a preview island**. Product navigation still drops the tailor into:

1. Atelier Home (closest to intended world).
2. Client / Production / Invoices rooms that **talk to unmounted `/customers` `/orders` `/invoices`** and therefore often render **ErrorState**, not a client atelier.
3. Orders/Materials/Reports that keep **legacy density and local modals** inside a token header.
4. Design Studio, whose protected interior is still the visual center of gravity.

The owner can honestly say “I don’t see the redesign” because they never visit `experience-preview.html`, and the rooms they work in are not the rooms PEX fully restyled.
