# UI verification checklist (human)

Do **not** treat this list as automated certification. Visual / cinematic judgement is the owner’s.

## Reachable rooms (StudioShell)

| Label | Reaches |
|---|---|
| Atelier Home | `AtelierHome` |
| Client Studio | `Customers` |
| Measurements | `MeasurementWorkspace` |
| Design | `DesignStudioFrame` + protected `DesignStudio` |
| Production | `ProductionBoard` |
| Orders / Materials / Invoices / Reports | business surfaces |
| Settings | tenant Settings overlay |
| Control Center | operator plane overlay |

`Dashboard.tsx` and `Layout.tsx` are **not routed**. Do not look for them.

## Visual identity (owner eyes)

- StitchFlow logo in nav
- Paper canvas tokens (not generic cyan SaaS splash only — splash is TRANSITIONAL)
- Workroom + PageHeader h2 under shell h1
- Focus rings on nav and buttons
- Reduced motion: OS setting should quiet splash / panel motion

## Motion / interaction

- Command palette Escape
- Customer add/edit uses shared Dialog (Escape, overlay click)
- FeatureGate has **no** Upgrade `alert`

## Responsive

Inspect at phone, tablet, laptop, desktop. Tables may scroll horizontally **by design**.

## Honesty

Empty lists stay empty. Control Center does not invent revenue.
