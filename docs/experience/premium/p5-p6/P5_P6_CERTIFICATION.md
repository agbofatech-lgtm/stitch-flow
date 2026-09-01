# P5/P6 Certification

Status: READY FOR OWNER ACCEPTANCE — not owner-accepted, no checkpoint tag.

Scores (honest, not 90+)

| Axis | Score | Basis |
|---|---|---|
| Visual | 76 | Workroom + PageHeader h2 on main rooms; Reports/Settings still mixed personality |
| Interaction | 78 | Honest FeatureGate; retry on HTTP rooms; Control Center structured fields |
| Overall | 77 | Evidence from code + tests + build, not screenshot lab |

FOUND

- FeatureGate no longer `alert()`s a fake Upgrade.
- Room titles use PageHeader `level={2}` so they do not compete with shell h1.
- Customers, Orders, Materials, Invoices, Production Board, Reports, Control Center use Workroom grammar.
- Settings simulate buttons labelled Simulate, not Upgrade.
- Control Center shows API keys/values only; live PSP deferred; Postgres not verified.

UNKNOWN

- WCAG lab, device lab, live PSP, Postgres persistence.

FAIL / NOT THIS SLICE

- Dashboard.tsx unused by StudioShell — not rebuilt.
- DesignStudio internals unchanged.
- Settings not fully Workroom-wrapped.
- P7/P8 not started.

Inherited tsc failures (`materials.ts` / `reports.ts` / `types.ts`) remain FAIL, not relabelled PASS.
