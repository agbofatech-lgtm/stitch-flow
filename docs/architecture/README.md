# StitchFlow Architecture

This directory is the **Level 2** governance layer.

| Level | Artifact | Question |
|---|---|---|
| 1 | Transformation Constitution | What StitchFlow fundamentally believes |
| 2 | **ADRs (this tree)** | What decisions govern implementation |
| 3 | Phase execution (T0–T7, Phases 13–19) | What is built, when, under which gates |

**T0 repository evidence** remains the locked source of *T0* truth. ADRs are the source of *binding future* truth. Where they conflict during transformation, implementations stop and escalate (STOP-ADR-09). They do not silently “fix” the repo to match an ADR.

**Current (post T1–T10 / P13–P19 / PEX) synthesis** for a future agent or engineer: [`AGENT_START_HERE.md`](./AGENT_START_HERE.md). That pack does not rewrite T0 maps. Drift is indexed at [`continuity/HISTORICAL_DRIFT_INDEX.md`](./continuity/HISTORICAL_DRIFT_INDEX.md).

## Contents

| Path | Purpose |
|---|---|
| [AGENT_START_HERE.md](./AGENT_START_HERE.md) | **Current continuity entrypoint** (2026-09-01) |
| [continuity/](./continuity/) | Synthesized runtime / data / protected / phase maps |
| [adr/](./adr/) | Architecture Decision Records ADR-001 … ADR-011 |
| [governance/](./governance/) | Constitution index, gate register, supersession policy |

Canonical vocabulary lives at [`docs/domain/CANONICAL_DOMAIN_VOCABULARY.md`](../domain/CANONICAL_DOMAIN_VOCABULARY.md) (not under this tree). Diagrams are not part of this pack.

T0 locked maps:

- [`PROTECTED_ASSET_REGISTRY.md`](./PROTECTED_ASSET_REGISTRY.md)
- [`RUNTIME_TRUTH_MAP.md`](./RUNTIME_TRUTH_MAP.md)
- [`DOMAIN_INTELLIGENCE_MAP.md`](./DOMAIN_INTELLIGENCE_MAP.md)
- [`DATA_AUTHORITY_MAP.md`](./DATA_AUTHORITY_MAP.md)

Master pack: [`docs/transformation/STITCHFLOW_ADR_MASTER_PACK.md`](../transformation/STITCHFLOW_ADR_MASTER_PACK.md)
