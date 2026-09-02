# SER-F10 Control Center implementation

The Control Center is the quieter operator plane of the same Digital Atelier building. It is not a second application and not the AGBOFA Platform Control Center.

## Spatial model (implemented)

```
CONTROL CENTER
  Identity (operator + workspace, display)
  ├── Workspace   existing AppContext identity; mutation stays in Settings
  ├── System      protected engines, SAC-1 — display only
  ├── Operations  FeatureGate presentation — display only
  └── Platform    ADR-007 honesty + optional /control API probe
```

Entry: existing nav item `Control Center`, command palette “Open Control Center”, previous header “Operator plane” (hidden while already on the plane). Exit: “Return to atelier” (`data-plane` returns to `atelier`). Settings remains a separate room.

## Shell

`AtelierShell` already exposed `data-plane="control"`. F10 uses that seam. No new shell.

While the plane is open:

- Inspector is withheld
- Atelier attention chip is withheld
- Header “Operator plane” shortcut is withheld
- Thread copy becomes “StitchFlow operator plane · not the AGBOFA platform”

## Surfaces

**Workspace.** Name, id, recorded currency, operator role from AppContext. “Open workspace settings” calls the existing Settings mount. No second store.

**System.** Pattern Engine, Production Assistant, measurement vocabulary, hosted Design Studio, SAC-1 trusted finalize — listed as protected / hosted / display only. No metrics invented.

**Operations.** FeatureGate flags shown as “allowed in UX” / “not allowed in UX”. Plan simulation stays in Settings. Live billing is not opened.

**Platform.** `BRAND.parentName` with ADR-007 copy. Optional “Platform API probe” is the pre-existing `/auth/login` + `/control/*` client, demoted from a login wall to an honest probe. `CommandPayload` still prints returned fields without inventing totals.

## Settings

Wrapped in `AtelierWorkroom`. Purpose states it is not live billing and not the AGBOFA platform. HTTP `fetchSettings` / members paths remain; they are not remounted as shop authority.

## What was not built

- AGBOFA Platform Control Center product
- Fake product switches
- Tenant administration UI
- Billing / PSP
- Auth redesign
- `/shop` migration
- Domain engine configuration
- Charts dashboard
