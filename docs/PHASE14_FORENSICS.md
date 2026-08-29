# Phase 14 — Stage 0 Forensics

**Date:** 2026-08-29 · **Branch:** `arena/01a04c42-stitch-flow`

## Git State

| Item | Value |
|---|---|
| Branch | `arena/01a04c42-stitch-flow` |
| HEAD | `d88d925` |
| Remote HEAD | `d88d925` (matches) |
| `phase-13-complete` deref | `d88d925` |
| Working tree | clean |
| Next migration | **019** |
| Dexie schema | v3 → next **v4** |

## Protected IP — ZERO DIFF vs phase-13-complete

- `DesignStudio.tsx` ✅
- `patternEngine.ts` ✅
- `productionAssistant.ts` ✅

## Baseline Gates (before Phase 14)

- Web TS: PASS (0 errors)
- Backend TS: PASS (0 errors)
- vitest: 61/61 PASS
- Build: ✓ 8s

## DesignStudio.tsx Forensic Audit (read-only)

**Entry point:** `export function DesignStudio()` — 4118 lines, no props.

**Consumed from AppContext:**
- `designStudioMeasurements: BodyMeasurements` — merged body/garment measurements
- `setDesignMeasurements(updates: Partial<BodyMeasurements>)` — adapter entry point
- `setGarmentMeasurements(updates: Partial<GarmentMeasurements>)` — adapter entry point
- `setFabricImage(dataUrl: string)` — fabric image as base64 data URL
- `fabricImage: string | null` — current fabric image
- `designInspirations: DesignInspiration[]` — legacy inspiration list
- `addDesignInspiration(...)` / `deleteDesignInspiration(id)` / `selectDesignInspiration(id|null)`
- `fabricRecords: FabricRecord[]` — inventory fabrics (not the same as Phase 14 fabric profiles)
- `patternLibrary: PatternLibraryItem[]`

**Garment types in Studio:** `bodice | shirt | trouser | skirt | kaftan | dress | gown | blouse | senator | agbada | custom`

**Image handling:** base64 data URLs via `FileReader.readAsDataURL` → stored in AppContext/localStorage.

**Adapter strategy:**
- Phase 14 adapter calls `setDesignMeasurements()` and `setGarmentMeasurements()` via AppContext — not touching DesignStudio.tsx.
- Fabric image: adapter calls `setFabricImage(dataUrl)` — fabric photo from Phase 14 FabricProfile.
- No props to DesignStudio — integration through AppContext setters only.

## Existing Types (preserved, not modified)

- `DesignInspiration` — legacy inspiration (title, category, imageUrl, fitType, fabricType etc.)
- `FabricRecord` — inventory fabric (quantityInStock, costPerUnit etc.) — different from Phase 14 FabricProfile
- `GarmentMeasurements` — flat measurement record
- `BodyMeasurements extends GarmentMeasurements` — required fields: bust, waist, neck, shoulder, backLength

## Phase 14 Architecture Strategy

1. **New server-side tables** (migration 019): `inspiration_references`, `fabric_profiles`, `design_specifications`, `design_specification_versions`.
2. **New client API module**: `src/shared/api/design.ts`
3. **New client service**: `src/modules/services/designService.ts` (offline-first, Dexie v4)
4. **Dexie v4 schema**: adds `inspirationsV14`, `fabricProfilesV14`, `designSpecsV14`, `localAssetsV14`.
5. **Phase 14 UI components**: `src/components/design/` — InspirationCapture, FabricProfileForm, DesignSpecEditor, ReadinessPanel, DesignStudioAdapter.
6. **Integration into CustomerDetail**: additive section (legacy untouched).
7. **Protected IP**: never touched — adapter calls AppContext setters only.

## Asset Strategy

- Images stored as **Blob in Dexie `localAssetsV14`** — avoids large base64 in localStorage.
- Asset metadata (id, filename, mimeType, size, thumbnailDataUrl) stored separately.
- `localAssetId` field references the Dexie blob record by ID.
- Backend receives base64 or multipart for server persistence (optional, offline-first).
