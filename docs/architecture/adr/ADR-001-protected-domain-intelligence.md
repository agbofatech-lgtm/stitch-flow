# ADR-001 — Protected Domain Intelligence

| Field | Value |
|---|---|
| ADR ID | ADR-001 |
| Title | Protected Domain Intelligence |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Constitutional |
| Scope | Pattern mathematics, production intelligence, deterministic tailoring logic |
| Supersession | None |

---

## Context

T0 forensics located proprietary and accumulated domain intelligence inside the StitchFlow repository, including:

- `apps/web/src/modules/services/patternEngine.ts`
- `apps/web/src/modules/services/productionAssistant.ts`
- measurement vocabulary in `apps/web/src/shared/types/index.ts`
- Design Studio–embedded garment/canvas rules
- `apps/backend/src/services/productionStageService.ts`

Their **current architecture** may be imperfect (UI-coupled, untested, unmounted). Their **domain intelligence** may still be highly valuable.

The primary risk is confusing **bad architecture** with **bad domain intelligence**. A poorly structured file may contain highly valuable algorithms.

Inventory: [`docs/architecture/PROTECTED_ASSET_REGISTRY.md`](../PROTECTED_ASSET_REGISTRY.md)

---

## Decision

StitchFlow shall classify deterministic tailoring intelligence as **Protected Domain Intelligence**.

Protected Domain Intelligence shall not be casually:

- rewritten
- replaced
- simplified
- “optimized”
- moved into new UI code as a rewrite
- replaced with AI inference
- altered during frontend redesign
- modified without behavioral regression evidence

Governing doctrine:

> Preserve behavior before improving structure.

---

## Protected asset categories

### Category A — Deterministic mathematical intelligence

Pattern geometry, measurement derivation, ease calculations, garment construction calculations, pattern dimensions, piece relationships.

### Category B — Production intelligence

Production sequencing, construction recommendations, manufacturing heuristics, tailoring workflow logic, material dependencies.

### Category C — Domain vocabulary

Bust, waist, hip, shoulder, across back, back length, sleeve length, garment length, ease, seam allowance — and the field set already present in `GarmentMeasurements`.

Vocabulary must not be casually renamed because UI terminology changes (see ADR-003).

---

## Mandatory protection mechanism

```
EXISTING INPUT
      │
      ▼
LEGACY DOMAIN ENGINE
      │
      ▼
CANONICAL OUTPUT SNAPSHOT
      │
      ▼
REGRESSION FIXTURE
      │
      ▼
ARCHITECTURAL EXTRACTION
      │
      ▼
NEW IMPLEMENTATION
      │
      ▼
OUTPUT COMPARISON
      │
      ▼
MATCH?  YES → PASS   NO → STOP
```

If extraction requires rewriting deterministic behavior before regression protection exists: **STOP** (T3/T7 stop condition).

---

## Deterministic trust suite (required eventually)

Every protected engine must eventually have canonical fixtures (example families: dress, shirt, skirt, trouser, bodice, kaftan, and culturally specific garments StitchFlow supports).

**T0 FACT:** no fixture harness exists yet. Creating it is authorized as *protection*, not as engine rewrite. It is a T1/T3 prerequisite for extraction, not a T0 gap that allows replacement.

---

## Constraints — prohibited actions

An implementation agent must stop before:

- “Cleaning up” formulas without regression tests
- Replacing deterministic logic with LLM output (ADR-004)
- Changing units without conversion validation
- Changing measurement definitions silently
- Moving pattern mathematics into React components as a rewrite
- Deleting “unused” logic without dependency analysis

---

## Consequences

- Frontend rebuild (T4–T7) must **consume** engines, not reimplement them.
- Extraction (T7) is surgical, not a greenfield Design Studio.
- Delivery speed (priority 6) cannot override this decision (priority 1).

---

## Compliance evidence

- Protected asset inventory (exists: T0.2)
- Hash or diff baseline (not yet hashed; git `b576c3e` is the code baseline)
- Regression fixture suite (missing — must be created before extraction)
- Before/after output comparison
- Architecture review approval

---

## Enforcement

Regression suite (ADR compliance matrix). STOP-ADR-01.
