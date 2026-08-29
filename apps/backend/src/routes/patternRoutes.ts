/**
 * Phase 15 — Pattern & Cutting Intelligence API routes.
 * Mounted in app.ts with authMiddleware + requireWorkspace.
 *
 * ROUTES:
 *   GET/POST  /customers/:customerId/pattern-models
 *   GET/PATCH  /customers/:customerId/pattern-models/:id
 *   GET        /customers/:customerId/pattern-models/:id/traceability
 *   GET        /customers/:customerId/pattern-models/:id/cutting-instructions
 *   GET        /customers/:customerId/pattern-models/readiness/:designSpecId
 *   GET/POST  /customers/:customerId/cutting-layouts
 *   GET        /customers/:customerId/cutting-layouts/:id
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { ApiError } from '../utils/apiError';
import * as ps from '../modules/pattern/patternService';
import { pool } from '../config/db';

// ---------------------------------------------------------------------------
// Pattern piece sub-schema
// ---------------------------------------------------------------------------

const patternPieceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  outlineCm: z.array(z.object({ x: z.number(), y: z.number() })),
  boundingBox: z.object({
    widthCm: z.number().nonnegative(),
    heightCm: z.number().nonnegative(),
    areaCm2: z.number().nonnegative(),
  }),
  seamAllowanceCm: z.number().nonnegative(),
  appliedEaseCm: z.number().nullable().optional(),
  grainline: z.enum(['lengthwise', 'crosswise', 'bias', 'any']),
  constraints: z.array(z.string()),
  requiresDirectionalFabric: z.boolean(),
  requiresPatternMatching: z.boolean(),
  patternMatchingManualVerificationRequired: z.boolean(),
  notes: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Pattern Model routes
// ---------------------------------------------------------------------------

export const patternModelRoutes = Router({ mergeParams: true });

// GET /customers/:customerId/pattern-models
patternModelRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const models = await ps.listPatternModels(pool, req.workspaceId!, req.params.customerId);
    res.json({ patternModels: models });
  }),
);

// POST /customers/:customerId/pattern-models
patternModelRoutes.post(
  '/',
  validate(z.object({
    body: z.object({
      id: z.string().optional(),
      name: z.string().min(1).max(255),
      version: z.number().int().positive().default(1),
      designSpecificationId: z.string().min(1),
      measurementProfileId: z.string().min(1),
      measurementProfileVersion: z.number().int().positive(),
      garmentCategory: z.string().min(1),
      engineKind: z.string().min(1),
      pieces: z.array(patternPieceSchema),
      derivationContext: z.record(z.unknown()),
      measurementCompleteness: z.record(z.unknown()),
      status: z.enum(['draft', 'derived', 'validated', 'ready_for_cutting', 'superseded'])
        .default('derived'),
      notes: z.string().nullable().optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const customerId = req.params.customerId;
    const id = req.body.id ?? `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const model = await ps.createPatternModel(pool, req.workspaceId!, customerId, {
      ...req.body,
      id,
      workspaceId: req.workspaceId!,
      customerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.status(201).json({ patternModel: model });
  }),
);

// GET /customers/:customerId/pattern-models/readiness/:designSpecId
patternModelRoutes.get(
  '/readiness/:designSpecId',
  asyncHandler(async (req, res) => {
    const { customerId, designSpecId } = req.params;
    const workspaceId = req.workspaceId!;

    const models = await ps.listPatternModels(pool, workspaceId, customerId);
    const existing = models.find(
      (m) => m.designSpecificationId === designSpecId && m.status !== 'superseded',
    );

    const dsResult = await pool.query(
      'SELECT status, measurement_profile_id, version FROM design_specifications WHERE id=$1 AND workspace_id=$2',
      [designSpecId, workspaceId],
    );
    const ds = dsResult.rows[0];
    if (!ds) throw new ApiError(404, 'NOT_FOUND', 'Design specification not found');

    const hasMeasurements = !!ds.measurement_profile_id;
    const hasPatternModel = !!existing;
    const hasCuttingLayout = hasPatternModel
      ? (await pool.query(
          'SELECT id FROM cutting_layouts WHERE pattern_model_id=$1 AND workspace_id=$2 LIMIT 1',
          [existing!.id, workspaceId],
        )).rows.length > 0
      : false;

    const readiness = ps.computePatternReadiness(
      true,
      ds.status,
      hasMeasurements,
      !hasMeasurements,
      hasPatternModel,
      hasCuttingLayout,
    );

    if (existing) {
      readiness.missingMeasurements = existing.measurementCompleteness.missing ?? [];
    }

    res.json({ readiness });
  }),
);

// GET /customers/:customerId/pattern-models/:id
patternModelRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const model = await ps.getPatternModel(pool, req.workspaceId!, req.params.id);
    if (!model) throw new ApiError(404, 'NOT_FOUND', 'Pattern model not found');
    if (model.customerId !== req.params.customerId) throw new ApiError(403, 'FORBIDDEN', 'Forbidden');
    res.json({ patternModel: model });
  }),
);

// PATCH /customers/:customerId/pattern-models/:id
patternModelRoutes.patch(
  '/:id',
  validate(z.object({
    body: z.object({
      name: z.string().min(1).max(255).optional(),
      status: z.enum(['draft', 'derived', 'validated', 'ready_for_cutting', 'superseded']).optional(),
      notes: z.string().nullable().optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const model = await ps.updatePatternModelStatus(
      pool,
      req.workspaceId!,
      req.params.id,
      req.body.status ?? 'derived',
      req.body.notes,
    );
    if (!model) throw new ApiError(404, 'NOT_FOUND', 'Pattern model not found');
    res.json({ patternModel: model });
  }),
);

// GET /customers/:customerId/pattern-models/:id/traceability
patternModelRoutes.get(
  '/:id/traceability',
  asyncHandler(async (req, res) => {
    const chain = await ps.getTraceabilityChain(pool, req.workspaceId!, req.params.id);
    if (!chain) throw new ApiError(404, 'NOT_FOUND', 'Pattern model not found');
    res.json({ traceability: chain });
  }),
);

// GET /customers/:customerId/pattern-models/:id/cutting-instructions
patternModelRoutes.get(
  '/:id/cutting-instructions',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cuttingLayoutId = req.query.cuttingLayoutId as string | undefined;
    const instructionSet = await ps.getCuttingInstructionSet(
      pool,
      req.workspaceId!,
      id,
      cuttingLayoutId,
    );
    if (!instructionSet) throw new ApiError(404, 'NOT_FOUND', 'Cutting instructions not found');
    res.json({ instructionSet });
  }),
);

// ---------------------------------------------------------------------------
// Cutting Layout routes
// ---------------------------------------------------------------------------

export const cuttingLayoutRoutes = Router({ mergeParams: true });

// GET /customers/:customerId/cutting-layouts
cuttingLayoutRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const layouts = await ps.listCuttingLayouts(pool, req.workspaceId!, req.params.customerId);
    res.json({ cuttingLayouts: layouts });
  }),
);

// POST /customers/:customerId/cutting-layouts
cuttingLayoutRoutes.post(
  '/',
  validate(z.object({
    body: z.object({
      id: z.string().optional(),
      patternModelId: z.string().min(1),
      fabricProfileId: z.string().nullable().optional(),
      layoutWidthCm: z.number().positive(),
      layoutEnvelopeCm: z.number().positive(),
      marginCm: z.number().nonnegative().default(2),
      placedPieces: z.array(z.object({
        pieceId: z.string(),
        copy: z.number().int().positive(),
        xCm: z.number().nonnegative(),
        yCm: z.number().nonnegative(),
        rotationDeg: z.number(),
        flipped: z.boolean(),
        effectiveWidthCm: z.number().positive(),
        effectiveHeightCm: z.number().positive(),
      })),
      validationIssues: z.array(z.object({
        severity: z.enum(['error', 'warning', 'info']),
        code: z.string(),
        message: z.string(),
        pieceIds: z.array(z.string()).optional(),
      })).default([]),
      isValid: z.boolean(),
      algorithm: z.literal('greedy_deterministic'),
      algorithmVersion: z.string().default('1.0.0'),
      notes: z.string().nullable().optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const customerId = req.params.customerId;
    const id = req.body.id ?? `cl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const model = await ps.getPatternModel(pool, req.workspaceId!, req.body.patternModelId);
    if (!model) throw new ApiError(404, 'NOT_FOUND', 'Pattern model not found');
    if (model.customerId !== customerId) throw new ApiError(403, 'FORBIDDEN', 'Forbidden');

    const layout = await ps.createCuttingLayout(pool, req.workspaceId!, customerId, {
      ...req.body,
      id,
      workspaceId: req.workspaceId!,
      customerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.status(201).json({ cuttingLayout: layout });
  }),
);

// GET /customers/:customerId/cutting-layouts/:id
cuttingLayoutRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const layout = await ps.getCuttingLayout(pool, req.workspaceId!, req.params.id);
    if (!layout) throw new ApiError(404, 'NOT_FOUND', 'Cutting layout not found');
    if (layout.customerId !== req.params.customerId) throw new ApiError(403, 'FORBIDDEN', 'Forbidden');
    res.json({ cuttingLayout: layout });
  }),
);
