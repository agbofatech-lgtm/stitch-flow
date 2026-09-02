# SER-F6 forensic data boundary

SER-F6 reconstructs presentation. It does not migrate authority.

## Map

| Experience element | Current source | Authority | Safe to use |
|---|---|---|---|
| Client identity | AppContext `customers` | Product UI SoT | Yes |
| Client list | AppContext `customers` | Same population as Floor | Yes |
| Selected client | `workflow.customerId` via `selectCustomer` | Presentation thread over AppContext | Yes |
| Selected order | `workflow.orderId` + AppContext `selectedOrderId` | F4/F5 thread; F6 hydrates client from the order | Yes |
| Orders / garment history | AppContext `getCustomerOrders` | Local workspace store | Yes |
| Live measurement profiles | AppContext `measurementProfiles` | Transitional; seed is empty until capture | Yes |
| Capture fields | T3 `BODY_MEASUREMENT_FIELDS` / `GARMENT_MEASUREMENT_FIELDS` | Protected vocabulary, presentation only | Yes |
| Completeness | `assessPatternInputCompleteness` | Existing domain; names missing keys | Yes |
| Pattern strip | `projectPatternMeasurements` | Derived. Not editable. | Yes |
| Freeze onto order | `workflow.freezeMeasurementsOnOrder` → `applyMeasurementProfileToOrder` | Existing order snapshot seam | Yes |
| T2 version / governed / snapshot | Existing T2 / T10 tools | Unchanged; demoted in UI | Yes |
| Units | Centimetres only | Do not imply dual-unit conversion | Yes |
| Connectivity badge | T2 connectivity + outbox count | Offline / queued / local. Not “synced” | Yes |
| Authenticated `/shop` | Not mounted on these screens | F14 | Do not use |
| Unauthenticated `/customers` | `customerApi` exists; Client room does not call it | Forbidden remount | Do not use |

## STOP conditions not triggered

- No remount of `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES`
- No `/shop` screen migration
- No fake remote customers, measurements, or sync language
- No Design Studio / Pattern Engine / Production Assistant / measurement vocabulary rewrite

## Honest gaps

- Live profiles are not frozen shop snapshots.
- Seed `measurementProfiles` starts empty; capture creates them in-session.
- Dual HTTP vs AppContext populations are no longer presented in the Client room. Production/Ledger HTTP interiors remain F8/F9.
