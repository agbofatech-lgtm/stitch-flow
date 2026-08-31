# Garment Type Mapping Analysis

## Canonical UI type — FACT

`GarmentType` = bodice | shirt | trouser | skirt | kaftan | dress | gown | senator | agbada | blouse | custom.

## Map to PatternKind — FACT (three identical switches)

| GarmentType | PatternKind |
|---|---|
| shirt, senator | shirt |
| trouser | trouser |
| skirt | skirt |
| kaftan, agbada | kaftan |
| dress, gown, blouse, custom, bodice | bodice |
| *(any other string)* | bodice (**pre-existing default**) |

## Map to MeasurementProfileType — FACT (`garmentLogic` / Studio save-as-profile)

| GarmentType | profileType |
|---|---|
| shirt, senator | shirt |
| dress, gown, kaftan, agbada, bodice | dress_kaba |
| skirt | skirt |
| trouser | trouser |
| blouse | blouse |
| custom | custom |

**CONFLICT:** kaftan/agbada/bodice collapse to `dress_kaba`. Reverse map `dress_kaba` → Studio `dress` only (`getGarmentTypeFromProfileType`). Applying a kaftan-saved-as-dress_kaba profile can retarget garment to **dress**.

**CONFLICT:** `handleSaveAsProfile` writes `profileType: garmentType` (11-value into 6-value type). Type system allows it at runtime.

## DesignCategory vs GarmentType — FACT

`inferGarmentTypeFromInspiration` is keyword heuristic (protected assistant). Categories `suit`, `bridal`, `wedding`, `casual`, `traditional`, `unisex`, `other`, `trousers` (plural) are **not** GarmentType values.

Library `PatternType` `sleeve` | `collar` | `suit` → Studio `custom`.

## Order.orderType

Free string. Forms default it to title-cased garment. **Not** a classification authority.
