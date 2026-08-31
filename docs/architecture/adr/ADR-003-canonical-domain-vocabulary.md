# ADR-003 — Canonical Domain Vocabulary

| Field | Value |
|---|---|
| ADR ID | ADR-003 |
| Title | Canonical Domain Vocabulary |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Constitutional |
| Scope | All code, APIs, schemas, documentation, analytics |
| Supersession | None |

---

## Context

T0 recorded uncontrolled synonyms (Customer vs ApiCustomer; BodyMeasurements vs GarmentMeasurements vs StudioMeasurements; BASIC/PRO/STUDIO vs free/pro/enterprise; TailorPro vs StitchFlow vs Tailor Studio).

Vocabulary ambiguity becomes data ambiguity.

---

## Decision

StitchFlow shall maintain a **Canonical Domain Vocabulary**.

Every significant business concept shall have: Canonical Name, Definition, Ownership, Relationships, Lifecycle, Allowed synonyms.

Required living artifact:

[`docs/domain/CANONICAL_DOMAIN_VOCABULARY.md`](../../domain/CANONICAL_DOMAIN_VOCABULARY.md)

---

## Initial canonical names (binding starters)

**Identity:** User, Tenant, Workspace, Role, Permission, Identity  

**Customer:** Customer, CustomerProfile, CustomerPreference, CustomerRelationship  

**Measurement:** MeasurementProfile, MeasurementSet, BodyMeasurement, GarmentMeasurement, PatternMeasurement, MeasurementVersion, MeasurementProvenance  

**Design:** GarmentDesign, DesignSelection, GarmentSpecification, DesignArtifact  

**Pattern:** PatternRequest, PatternOutput, PatternPiece, PatternPoint, PatternGuide, PatternInstruction  

**Production:** ProductionPlan, ProductionJob, ProductionStage, ProductionTask, QualityCheck  

**Commercial:** Plan, Subscription, Entitlement, Usage, Invoice, Payment  

---

## Enforcement rules

Before introducing a domain name: does it exist? synonym? subtype? owner? lifecycle? glossary?

**API:** one canonical path family per entity. Do not ship `/clients` and `/customers` and `/people` for the same thing.

**Database:** do not accumulate overlapping tables (`clients`, `customer_profiles`, `people`, `customer_data`) without explicit boundaries.

**New work** must use canonical names. **Existing files** are not mass-renamed in T1 (that would violate ADR-001 and create unreviewable diffs). Renames are T3+ with mapping layers (ADR-010 anti-corruption).

---

## Constraints

STOP-ADR-08 if new terminology conflicts with the glossary.

Do not invent parallel measurement systems under new names without relating them to Body / Garment / Pattern.

---

## Compliance evidence

Domain glossary review on every phase that introduces types, routes, or tables.

---

## Enforcement

Glossary review. STOP-ADR-08.
