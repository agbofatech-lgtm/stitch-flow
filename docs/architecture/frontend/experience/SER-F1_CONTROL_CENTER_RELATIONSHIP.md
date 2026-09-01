# Control Center relationship

Two planes, one company.

| | Atelier | Control Center |
|---|---|---|
| Whose work | Tailor | AGBOFA operator |
| Identity | Workspace member (AppContext today) | Platform JWT `/auth` |
| Visual | Warm paper, light | Dark tokens (`data-theme=dark`) — **intentional**, not a bug |
| Navigation | Craft rooms | Overlay / explicit entry (current Control button) |
| Permissions | Shop work | Operator `/control` |
| Commercial | FeatureGate UX_ONLY; shop invoices ≠ SaaS | Billing **provider port**, not live PSP |
| Data | AppContext / later `/shop` | Platform file store |

The Control Center must feel like the **back office of the same building**: same type tokens, same logo family, darker materials, denser information. It must not become a third visual language (JSON dump) and must not restyle the atelier dark.

Do not merge Control into Floor. Do not hide it. Do not implement a new ops UI in F1.
