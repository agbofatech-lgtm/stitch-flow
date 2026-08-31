# P19 Commercial Infrastructure Inventory

| Artifact | Location | Purpose | Authority | Persistence | Runtime | Class |
|---|---|---|---|---|---|---|
| Tier / BillingStatus types | `shared/types/index.ts` | Plan codes BASIC/PRO/STUDIO | Type only | none | AppContext mock | **PARTIAL** |
| `tiers` mock + FEATURE_COMPARISON USD $0/$29/$79 | `tierEnforcement.ts` / mockData | Simulated limits | UI/logic sim | mock | client | **TRANSITIONAL / UI** |
| `TIER_META` GHS 45/90 | `config/tiers.ts` | Second price table | UI | none | client | **LEGACY duplicate** vs USD table |
| FeatureGate + `window.alert` upgrade | `FeatureGate.tsx` | UX lock | not billing | none | client | **UI ONLY** |
| Shop Invoice / Payment | types + AppContext + backend paymentRoutes | Customer job money | operational domain | AppContext / SQL if mounted | **shop-floor ≠ SaaS** | **AUTHORITATIVE for jobs only** |
| `FREE_DEVICE_LIMIT` etc. | `.env.example` | Device caps | config names | env | unused by live stub | **STUB** |
| `authService` license/tier free\|pro\|enterprise | `modules/services/authService.ts` | Register+license | **third vocab** vs BASIC/PRO/STUDIO | intended DB | **UNKNOWN if mounted** | **LEGACY / CONFLICT** |
| Stripe/Paystack/Flutterwave | — | — | — | — | — | **ABSENT** |
| SaaS subscription table | — | — | — | — | — | **ABSENT** |
| Control Center | — | — | ADR-007 | — | — | **ABSENT** |

**FACT:** ADR-006 forbids treating FeatureGate as commercial authority. Shop invoices must not become SaaS invoices.
