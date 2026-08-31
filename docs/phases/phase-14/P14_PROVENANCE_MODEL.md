# P14 Provenance Model

Runtime envelope on evaluation and freeze:

- source: studio | order | legacy | imported | manual
- extractionPath: studio-adapter | manual | order-extract | legacy-projection
- authorityLevel: live | observed | transitional | governed | frozen | derived | unknown

**FACT:** Frozen versions set authorityLevel `frozen`. Evaluated (unfrozen) results are `governed`.
