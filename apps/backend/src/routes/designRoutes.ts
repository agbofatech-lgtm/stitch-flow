/**
 * Phase 14 — Design Intelligence API routes.
 * Mounted in app.ts with authMiddleware + requireWorkspace.
 * All paths enforce workspace ownership server-side.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { ApiError } from '../utils/apiError';
import * as insp from '../modules/design/inspirationService';
import * as fab from '../modules/design/fabricService';
import * as ds from '../modules/design/designSpecService';
import * as asset from '../modules/design/assetService';
import { buildMeasurementContext, computeDesignSuggestions } from '../modules/design/measurementAdapter';

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------
export const assetRoutes = Router();

assetRoutes.post(
  '/',
  validate(z.object({
    body: z.object({
      id: z.string().optional(),
      filename: z.string().min(1).max(255),
      mimeType: z.string().min(1).max(100),
      sizeBytes: z.number().int().nonnegative().optional(),
      widthPx: z.number().int().nonnegative().optional(),
      heightPx: z.number().int().nonnegative().optional(),
      thumbnailDataUrl: z.string().max(20000).optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const record = await asset.registerAsset(req.workspaceId!, req.body, req.body.id);
    res.status(201).json({ asset: record });
  }),
);

assetRoutes.get(
  '/:assetId',
  asyncHandler(async (req, res) => {
    const record = await asset.getAsset(req.workspaceId!, req.params.assetId);
    if (!record) throw new ApiError(404, 'NOT_FOUND', 'Asset not found');
    res.json({ asset: record });
  }),
);

// ---------------------------------------------------------------------------
// Inspiration References (customer-scoped)
// ---------------------------------------------------------------------------
export const inspirationRoutes = Router({ mergeParams: true });

const observationSchema = z.object({
  category: z.enum([
    'garment','silhouette','length','sleeve','neckline',
    'component','construction','decoration','fit','other',
  ]),
  value: z.string().min(1).max(200),
  confidence: z.enum(['manual','confirmed','uncertain']).optional(),
  notes: z.string().max(500).optional(),
});

const inspirationBodySchema = z.object({
  id: z.string().optional(),
  sourceType: z.enum([
    'image_upload','camera_capture','existing_garment','reference_url','screenshot','manual',
  ]),
  title: z.string().min(1).max(200),
  sourceUrl: z.string().url().max(2000).nullable().optional(),
  localAssetId: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
  observations: z.array(observationSchema).max(50).optional(),
});

inspirationRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const list = await insp.listInspirations(req.workspaceId!, req.params.customerId);
    res.json({ inspirations: list });
  }),
);

inspirationRoutes.post(
  '/',
  validate(z.object({ body: inspirationBodySchema })),
  asyncHandler(async (req, res) => {
    const reference = await insp.createInspiration(req.workspaceId!, {
      ...req.body,
      customerId: req.params.customerId ?? null,
    });
    res.status(201).json({ inspiration: reference });
  }),
);

inspirationRoutes.get(
  '/:inspirationId',
  asyncHandler(async (req, res) => {
    const reference = await insp.getInspiration(req.workspaceId!, req.params.inspirationId);
    res.json({ inspiration: reference });
  }),
);

inspirationRoutes.patch(
  '/:inspirationId',
  validate(z.object({
    body: inspirationBodySchema.partial(),
  })),
  asyncHandler(async (req, res) => {
    const reference = await insp.updateInspiration(req.workspaceId!, req.params.inspirationId, req.body);
    res.json({ inspiration: reference });
  }),
);

inspirationRoutes.delete(
  '/:inspirationId',
  asyncHandler(async (req, res) => {
    await insp.deleteInspiration(req.workspaceId!, req.params.inspirationId);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Fabric Profiles (workspace-scoped)
// ---------------------------------------------------------------------------
export const fabricProfileRoutes = Router();

const widthSchema = z.object({ value: z.number().positive(), unit: z.enum(['cm','inch']) }).nullable().optional();
const lengthSchema = z.object({ value: z.number().positive(), unit: z.enum(['yard','meter','cm']) }).nullable().optional();

const fabricBodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  localAssetId: z.string().nullable().optional(),
  fabricType: z.string().max(50).nullable().optional(),
  width: widthSchema,
  availableLength: lengthSchema,
  properties: z.object({
    directional: z.boolean().optional(),
    patternRepeat: z.boolean().optional(),
    patternRepeatSizeCm: z.number().nonnegative().nullable().optional(),
    requiresMatching: z.boolean().optional(),
    stretch: z.enum(['none','low','medium','high']).optional(),
    transparency: z.enum(['opaque','semi-sheer','sheer']).optional(),
  }).optional(),
  notes: z.string().max(2000).optional(),
});

fabricProfileRoutes.get('/', asyncHandler(async (req, res) => {
  const list = await fab.listFabricProfiles(req.workspaceId!);
  res.json({ fabricProfiles: list });
}));

fabricProfileRoutes.post('/', validate(z.object({ body: fabricBodySchema })), asyncHandler(async (req, res) => {
  const profile = await fab.createFabricProfile(req.workspaceId!, req.body);
  res.status(201).json({ fabricProfile: profile });
}));

fabricProfileRoutes.get('/:fabricProfileId', asyncHandler(async (req, res) => {
  const profile = await fab.getFabricProfile(req.workspaceId!, req.params.fabricProfileId);
  res.json({ fabricProfile: profile });
}));

fabricProfileRoutes.patch('/:fabricProfileId', validate(z.object({ body: fabricBodySchema.partial() })), asyncHandler(async (req, res) => {
  const profile = await fab.updateFabricProfile(req.workspaceId!, req.params.fabricProfileId, req.body);
  res.json({ fabricProfile: profile });
}));

fabricProfileRoutes.delete('/:fabricProfileId', asyncHandler(async (req, res) => {
  await fab.deleteFabricProfile(req.workspaceId!, req.params.fabricProfileId);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Design Specifications (customer-scoped)
// ---------------------------------------------------------------------------
export const designSpecRoutes = Router({ mergeParams: true });

const componentSchema = z.object({
  type: z.string().min(1).max(60),
  notes: z.string().max(500).nullable().optional(),
  required: z.boolean().optional(),
});

const easeSchema = z.object({
  area: z.enum(['chest','waist','hip','bicep']),
  valueCm: z.number(),
  source: z.enum(['default','garment','tailor_override']),
});

const specBodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  garment: z.object({
    category: z.string().min(1).max(60),
    subtype: z.string().max(60).nullable().optional(),
    silhouette: z.string().max(60).nullable().optional(),
    fit: z.enum(['fitted','slim','regular','relaxed','loose','oversized','custom']).nullable().optional(),
    lengthType: z.string().max(60).nullable().optional(),
    targetLengthCm: z.number().positive().nullable().optional(),
  }),
  sleeves: z.object({
    type: z.string().min(1).max(60),
    targetLengthCm: z.number().positive().nullable().optional(),
  }).nullable().optional(),
  neckline: z.object({ type: z.string().min(1).max(60) }).nullable().optional(),
  components: z.array(componentSchema).max(50).optional(),
  constructionDetails: z.array(z.string().max(100)).max(50).optional(),
  easeConfigurations: z.array(easeSchema).max(20).optional(),
  observations: z.array(observationSchema).max(100).optional(),
  measurementProfileId: z.string().nullable().optional(),
  inspirationIds: z.array(z.string()).max(20).optional(),
  fabricProfileIds: z.array(z.string()).max(20).optional(),
  notes: z.string().max(2000).optional(),
});

designSpecRoutes.get('/', asyncHandler(async (req, res) => {
  const list = await ds.listDesignSpecs(req.workspaceId!, req.params.customerId);
  res.json({ designSpecifications: list });
}));

designSpecRoutes.post('/', validate(z.object({ body: specBodySchema })), asyncHandler(async (req, res) => {
  const spec = await ds.createDesignSpec(req.workspaceId!, {
    ...req.body,
    customerId: req.params.customerId ?? null,
  });
  res.status(201).json({ designSpecification: spec });
}));

designSpecRoutes.get('/:specId', asyncHandler(async (req, res) => {
  const spec = await ds.getDesignSpec(req.workspaceId!, req.params.specId);
  if (spec.customerId && spec.customerId !== req.params.customerId) {
    throw new ApiError(404, 'NOT_FOUND', 'Design specification not found for this customer');
  }
  res.json({ designSpecification: spec });
}));

designSpecRoutes.patch('/:specId', validate(z.object({ body: specBodySchema.partial().extend({ status: z.enum(['draft','partial','ready_for_design','validated','ready_for_pattern']).optional() }) })), asyncHandler(async (req, res) => {
  const spec = await ds.updateDesignSpec(req.workspaceId!, req.params.specId, req.body);
  res.json({ designSpecification: spec });
}));

designSpecRoutes.get('/:specId/history', asyncHandler(async (req, res) => {
  const history = await ds.getDesignSpecHistory(req.workspaceId!, req.params.specId);
  res.json({ history });
}));

// Measurement adapter endpoint — Phase 13 → Design context (no raw measurement data exposed)
designSpecRoutes.get('/:specId/measurement-context', asyncHandler(async (req, res) => {
  const spec = await ds.getDesignSpec(req.workspaceId!, req.params.specId);
  if (!spec.measurementProfileId) {
    return res.json({ measurementContext: null, suggestions: [] });
  }
  const ctx = await buildMeasurementContext(req.workspaceId!, spec.measurementProfileId);
  const suggestions = ctx ? computeDesignSuggestions(ctx, spec.garment.fit ?? 'regular') : [];
  res.json({ measurementContext: ctx, suggestions });
}));
