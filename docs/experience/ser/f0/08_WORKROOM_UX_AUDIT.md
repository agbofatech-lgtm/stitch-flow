# Workroom UX audit

SOURCE-EVIDENCED. Visual quality NOT VERIFIED.

## Client Studio

**PURPOSE:** relationship + identity.  
**CURRENT:** HTTP list from `/customers`. With default backend, fetch 404 → ErrorState. AppContext customers (Atelier Home counts) are a **different population**.  
**HIERARCHY:** PageHeader + search + list/dialogs.  
**INTERACTION:** shared Dialog (better than nested ModalShell).  
**THEMATIC:** admin directory, not a client atelier.  
**CINEMATIC POTENTIAL:** high if bound to measurements/design.  
**LEGACY DEBT:** unmounted API; debugInfo string in source.  
**SER PRIORITY:** HIGH after shell constitution — but data authority must not remount unauthenticated CRUD.

## Measurement atelier

**PURPOSE:** body vs garment vs pattern.  
**CURRENT:** DataTable of AppContext profiles; freeze-to-T2 actions; completeness counts.  
**HIERARCHY:** clearer domain language than Clients.  
**INTERACTION:** FUNCTIONAL.  
**THEMATIC:** technical atelier — aligned.  
**CINEMATIC:** freeze could be a moment; currently a status string.  
**SER PRIORITY:** MEDIUM (already closer).

## Design

See `07_`. Creative but isolated. Priority: frame later; internals locked.

## Production

**PURPOSE:** living floor.  
**CURRENT:** HTTP `/orders` + `/customers`. Default: ErrorState. Description even says “real backend stage persistence.”  
**HIERARCHY:** PageHeader + leftover full-page gradient.  
**THEMATIC:** operations board, not a cutting table.  
**SER PRIORITY:** HIGH experience break (load failure), then visual.

## Business — Orders

AppContext local SoT. Workroom wrap + **local OrderFormModal** (not shared Dialog). Usable offline. Feels like a form app. SER: modal unification + object continuity.

## Materials

AppContext + FeatureGate. Local MaterialModal. Inventory, not a cloth room.

## Invoices / Reports

Invoices: HTTP — likely error. Reports: local metrics, dense cards, dashboard grammar. Business feels like accounting software *when it loads*; otherwise a failure screen.

## Atelier Home

Best thematic alignment. Uses local SoT so it can look alive while Clients look broken. That inconsistency is itself an experience bug.
