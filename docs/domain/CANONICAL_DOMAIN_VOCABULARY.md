# Canonical Domain Vocabulary

| Field | Value |
|---|---|
| Status | **T3 field lock (partial)** — binding for *new* names; existing files are not mass-renamed |
| Date | 2026-08-31 |
| Authority | ADR-003 |
| Owner of this glossary | Principal Architecture Governance until a Domain Owner is named |
| Full lock | T3 locked Body vs Garment vs Pattern classes and money field `totalAmount`. Legacy type names remain. |

Governing ADR: [`docs/architecture/adr/ADR-003-canonical-domain-vocabulary.md`](../architecture/adr/ADR-003-canonical-domain-vocabulary.md)

T0 evidence of drift: [`docs/architecture/DOMAIN_INTELLIGENCE_MAP.md`](../architecture/DOMAIN_INTELLIGENCE_MAP.md) §9.

---

## Discipline

| Kind | Use in this file |
|---|---|
| **CANONICAL** | The name new work must use |
| **FACT (repo)** | Names and types that exist today |
| **SYNONYM** | Allowed informal or legacy alias; must map to canonical |
| **FORBIDDEN parallel** | Must not be introduced as a second concept |
| **PROPOSAL** | Target split not yet implemented |

**T1 rule:** do not mass-rename existing files, tables, or UI copy to match this glossary. That would violate ADR-001 (unreviewable diffs against protected intelligence) and create false “compliance.” Renames happen in T3+ with anti-corruption mapping (ADR-010).

**STOP-ADR-08:** introducing a new term that conflicts with this glossary without relating it here.

Before introducing a domain name, answer: does it exist? synonym? subtype? owner? lifecycle?

---

## 1. Product identity

| Canonical | Definition | FACT (repo) | Notes |
|---|---|---|---|
| **StitchFlow** | The product in this repository | Also: Tailor Studio, TailorPro (PWA manifest / copy) | Brand aliases are SYNONYM, not separate products |
| **AGBOFA** | Platform operator / parent platform | Named in ADR-007; no Control Center app in this repo | Platform ≠ Studio |

FORBIDDEN parallel: shipping a second product name as if it were a different system without an ADR.

---

## 2. Identity and tenancy

| Canonical | Definition | Ownership (target) | FACT (repo) | Lifecycle (target) |
|---|---|---|---|---|
| **User** | Authenticated human actor | Platform identity | Types exist; **no UI**; JWT stack unused | Create → authenticate → deactivate |
| **Identity** | Auth subject (credentials, session) | Platform | Absent in product | — |
| **Tenant** | Commercial / isolation boundary | Platform | Not a first-class running entity | — |
| **Workspace** | Operational workspace inside a tenant | StitchFlow application | Mock ids in localStorage `stitchflow:session:currentWorkspaceId` | — |
| **Role** | Named permission set | Platform | Partial types | — |
| **Permission** | Atomic authorization | Platform | Partial types | — |
| **WorkspaceMember** | User in a workspace | Application | Types; mock `currentMemberId` | — |

SYNONYM: `licenses.user` (SQL, unused) → User.  
FORBIDDEN parallel: `ClientUser` vs `TailorUser` vs `Account` without mapping.

---

## 3. Customer relationship

| Canonical | Definition | Ownership (target) | FACT (repo) |
|---|---|---|---|
| **Customer** | Person or entity for whom garments are made | StitchFlow domain | Two populations: AppContext `Customer` (localStorage) and `ApiCustomer` (HTTP stub) |
| **CustomerProfile** | Stable attributes of a Customer | StitchFlow domain | Mixed into Customer records |
| **CustomerPreference** | Fit/style/communication preferences | StitchFlow domain | Not a distinct type |
| **CustomerRelationship** | History of work with a Customer | StitchFlow domain | Implicit via Orders |

SYNONYM: `ApiCustomer` → Customer (transport shape, not a second entity).  
FORBIDDEN parallel: `/clients`, `/people`, `customer_data` as a second SoT.

**T0 FACT:** two customer populations can exist on one device. That is a data-authority defect (ADR-002), not two canonical concepts.

---

## 4. Measurement

Intended separation (ADR-003): Body vs Garment vs Pattern.  
**T0 FACT:** they were one blob with aliases.  
**T3 FACT:** the split is enforced in `apps/web/src/domain/measurement` without renaming `shared/types`. Legacy UI blobs remain mixed until T7.

| Canonical | Definition | FACT (repo) |
|---|---|---|
| **MeasurementProfile** | Named, versionable set of measurements for a Customer | `CustomerMeasurementProfile` in localStorage |
| **MeasurementSet** | A concrete collection of numeric fields at a point in time | Mixed |
| **BodyMeasurement** | Body-taken dimensions | `BodyMeasurements` (required bust, waist, neck, shoulder, backLength; extends garment fields) |
| **GarmentMeasurement** | Garment-oriented dimensions / ease-aware fields | `GarmentMeasurements` (40+ optional numerics + notes) |
| **PatternMeasurement** | Values the pattern engine actually consumes | Engine input map; not a separate type |
| **MeasurementVersion** | Immutable snapshot of a MeasurementSet | Not implemented as versions |
| **MeasurementProvenance** | How/when/who captured the set | Not implemented |
| **OrderMeasurementSnapshot** | Freeze of measurements onto an Order | `OrderMeasurementSnapshot` type exists |

SYNONYMS already in UI (FACT — mapping layer required later, do not “fix” in T1):

| Alias | Maps toward |
|---|---|
| chest | bust |
| sleeve | sleeveLength |
| ankle | aroundAnkle |
| StudioMeasurements / ExtendedMeasurements | GarmentMeasurement / BodyMeasurement (unspecified mix) |

Protected field family (ADR-001 Category C) — do not casually rename because UI terminology changes:

bust, waist, hip, shoulder, across back, back length, sleeve length, garment length, ease, seam allowance — and the field set already present in `GarmentMeasurements` (`apps/web/src/shared/types/index.ts`).

Units: **FACT** centimetres assumed in Pattern Engine; no conversion layer. Fabric estimates default **yards** in Production Assistant. Do not silently change units (ADR-001).

FORBIDDEN parallel: a second measurement system under new names without relating it to Body / Garment / Pattern.

---

## 5. Design

| Canonical | Definition | FACT (repo) |
|---|---|---|
| **GarmentDesign** | The design intent for a garment | Mixed into Design Studio + Order patch |
| **DesignSelection** | Chosen options (style, fabric, inspiration) | Studio session localStorage |
| **GarmentSpecification** | Canonical, contractable spec | **GAP** — does not exist as a named contract (T7 target) |
| **DesignArtifact** | Durable output of design work | Partial Order patch + PNG previews |
| **DesignInspiration** | Reference image/notes feeding heuristics | AppContext entity; keyword “analysis” |
| **GarmentType** | Style kind union | `shared/types` union; engine `StylePatternKind` |

Pattern kinds implemented in engine (FACT): bodice, shirt, trouser, skirt, kaftan.  
Mapped in Design Studio (FACT): dress/gown/blouse → bodice; senator → shirt; agbada → kaftan.

Canvas silhouettes (`buildUpperGarmentShape`, etc.) are **EXPERIENCE**, not pattern geometry.

---

## 6. Pattern

| Canonical | Definition | Ownership (target) | FACT (repo) |
|---|---|---|---|
| **PatternRequest** | Inputs to generation (kind + measurements + style flags) | Domain | Function arguments; no persisted request entity |
| **PatternOutput** | Deterministic geometry and instructions | Domain (protected) | Regenerated; not stored as geometry |
| **PatternPiece** | One cut piece | Domain | Piece notes / outlines in engine output |
| **PatternPoint** | Named control point | Domain | Bodice control points |
| **PatternGuide** | Construction guides / notches | Domain | Engine guides/notches |
| **PatternInstruction** | Human-readable construction notes | Domain | Piece notes |
| **PatternLibraryItem** | Saved preview / reusable item | Application cache | PNG data URLs in localStorage |

Authority: PatternOutput is **derived from the deterministic engine**, not from UI (ADR-001, ADR-005).

---

## 7. Production

| Canonical | Definition | FACT (repo) |
|---|---|---|
| **ProductionPlan** | Heuristic plan: fabric estimate, cutting list, sewing checklist, fit risks, notes | `generateProductionPlan` → stored on local `Order.productionPlan` |
| **ProductionJob** | Executable work against an Order | Not a distinct type; Order is the job |
| **ProductionStage** | Named stage in the manufacturing sequence | Backend codes: measurement → cutting → sewing → embroidery → first_fitting → second_fitting → final_press → ready → delivered |
| **ProductionTask** | Work item inside a stage | Not a distinct type |
| **QualityCheck** | Explicit QA gate | Implicit in fittings; not a type |

**Do not re-invent stage codes in the UI** (Protected Asset Registry §5).

FACT: frontend also keeps `productionStages[]` on local orders and calls **wrong** HTTP paths (`/orders/:id/stages` vs `/orders/:id/production-stages`). That is ADR-010 drift, not two stage languages.

Shop-floor **Invoice** and **Payment** (customer jobs) are StitchFlow operational domain. They are **not** SaaS billing (ADR-006).

---

## 8. Order and materials

| Canonical | Definition | FACT (repo) |
|---|---|---|
| **Order** | Customer job for one or more garments | localStorage for Orders.tsx; HTTP stub for Production Board / Dashboard |
| **FabricRecord** | Stocked fabric | AppContext local |
| **MaterialUsage** | Fabric consumed by an Order | AppContext; auto-deduct on cutting start |
| **JobSheet** | Printable production sheet | `jobSheetExport.ts` |

Money field lock (T3): Order/Invoice **totalAmount** is canonical. Payment **amount** is the transfer, not an order total. Record birth **createdAt**; due **dueDate**. Informal `date` is a synonym, not a second field. New DTOs must not introduce `amount` on Order.

---

## 9. Commercial (SaaS) vs shop finance

| Canonical | Definition | Authority (target) | FACT (repo) |
|---|---|---|---|
| **Plan** | Packaged commercial offer | Commercial platform (ADR-006) | Simulated BASIC/PRO/STUDIO vs copy free/pro/enterprise |
| **Subscription** | Tenant’s plan enrollment | Platform | Absent |
| **Entitlement** | Feature/limit grant | Platform | `tierEnforcement.ts` / FeatureGate `window.alert` |
| **Usage** | Metered consumption | Platform | Absent |
| **Invoice** (SaaS) | Platform invoice to tenant | Platform | Unused license SQL |
| **Payment** (SaaS) | Platform payment | Platform | Absent |
| **Invoice** (shop) | Bill to Customer for an Order | StitchFlow ops | Invoices.tsx HTTP stub; AppContext seed unused by that screen |
| **Payment** (shop) | Customer payment against shop Invoice | StitchFlow ops | Path drift `/invoices/:id/payments` vs `/payments` |

Invoice status drift (FACT): sent/partial/paid/overdue/void vs pending/partial/paid/overdue.

FORBIDDEN: a third price table in new screens (ADR-006).  
Two existing tables (GHS vs USD) are **DANGEROUS** simulation, not catalog authority.

---

## 10. Platform administration

| Canonical | Definition | Authority |
|---|---|---|
| **AGBOFA Control Center** | Platform governance and operational command | ADR-007 — **does not exist in this repo** |
| **Feature flag** | Operational enablement | Configuration (ADR-011), authority ADR-007 |
| **Audit log** | Immutable record of significant actions | Platform; SQL exists unused |

StitchFlow **Settings** is a product workspace screen, not Control Center.

---

## 11. Persistence and sync (vocabulary only)

| Canonical | Definition | FACT (repo) |
|---|---|---|
| **Local store** | First-class operational state (target: IndexedDB) | Today: localStorage (not permitted as future SoT for business entities — ADR-002) |
| **Sync engine** | Queue + metadata + conflict handling | Absent |
| **SyncMetadata** | localId, remoteId, version, timestamps, syncStatus | Specified in ADR-002; not implemented |
| **Platform API** | Authoritative HTTP contract | Live: stub `server.ts` :5000; real CRUD in unmounted `app.ts` |

Do not call current behavior **offline-first**. That term is reserved for ADR-002’s target.

---

## 12. AI and 3D (naming honesty)

| Term | Allowed meaning | Forbidden meaning today |
|---|---|---|
| **AI** | Future advisory system (ADR-004) | Labeling `productionAssistant` keyword heuristics as a model |
| **Virtual fitting** | ADR-005 Level 3 only | 2D canvas preview |
| **Visualization** | ADR-005 Level 1 | Claiming physical fit accuracy |

---

## 13. API and contract words

| Canonical | Rule |
|---|---|
| One path family per entity | Do not ship `/clients` and `/customers` for the same thing |
| DTO | Transport shape at the contract boundary (ADR-010) |
| Domain model | Not equal to a SQL row or a React state blob |

Known path conflicts (FACT — T1 contract baseline must resolve, not T0 rename):

- `/orders/:id/stages` vs `/orders/:id/production-stages`
- `/invoices/:id/payments` vs `/payments`
- `VITE_API_BASE_URL` vs `VITE_API_URL`
- `docs/api.md` `/api/v1` not mounted

---

## 14. Change control for this glossary

- Additive entries: allowed when they do not collide.
- Changing a canonical name: requires ADR-003 amendment via **new ADR** (supersession policy), not a silent edit of Accepted ADR-003.
- Mapping layers for legacy names: T3+ work.
- T1 may *document* mappings in `API_CONTRACT_BASELINE.md` without renaming source.

---

**T3 glossary lock (partial).** Field-class tables live in `apps/web/src/domain/measurement/fields.ts`. Mapping layers for remaining UI synonyms continue in T7; do not mass-rename protected files.
