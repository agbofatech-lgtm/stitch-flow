/**
 * Phase 16 — Production Intelligence API routes.
 * Mounted in app.ts with authMiddleware + requireWorkspace.
 *
 * ROUTES:
 *   GET/POST  /production-plans
 *   GET        /production-plans/:id
 *   GET        /production-plans/:id/fabric-consumption
 *   GET        /production-plans/:id/purchasing
 *   GET        /production-plans/:id/readiness
 *   GET        /production-plans/:id/traceability
 *   PATCH      /production-plans/:id/operations/:operationId
 *   PATCH      /production-plans/:id/quality/:checkpointId
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { ApiError } from '../utils/apiError';
import * as ps from '../modules/production/productionService';
import { pool } from '../config/db';

export const productionRoutes = Router({ mergeParams: true });

// GET /production-plans?customerId=...
productionRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const customerId = req.query.customerId as string;
    if (!customerId) throw new ApiError(400, 'VALIDATION_ERROR', 'customerId query param required');
    const plans = await ps.listProductionPlans(pool, req.workspaceId!, customerId);
    res.json({ productionPlans: plans });
  }),
);

// POST /production-plans
productionRoutes.post(
  '/',
  validate(z.object({
    body: z.object({
      id: z.string().optional(),
      customerId: z.string().min(1),
      designSpecificationId: z.string().min(1),
      cuttingLayoutId: z.string().min(1),
      patternModelId: z.string().nullable().optional(),
      fabricConsumption: z.record(z.unknown()),
      purchasingRecommendation: z.record(z.unknown()).nullable().optional(),
      materials: z.array(z.record(z.unknown())).default([]),
      cuttingExecutionPlan: z.array(z.record(z.unknown())).default([]),
      operations: z.array(z.record(z.unknown())).default([]),
      estimatedTotalTimeMinMinutes: z.number().int().nonnegative().default(0),
      estimatedTotalTimeExpectedMinutes: z.number().int().nonnegative().default(0),
      estimatedTotalTimeMaxMinutes: z.number().int().nonnegative().default(0),
      qualityCheckpoints: z.array(z.record(z.unknown())).default([]),
      readiness: z.record(z.unknown()),
      status: z.enum(['draft','attention_required','ready','in_production','quality_control','completed','blocked']).default('draft'),
      traceability: z.record(z.unknown()),
      notes: z.string().nullable().optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = await ps.createProductionPlan(pool, req.workspaceId!, {
      ...req.body,
      id: req.body.id ?? `pp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: req.workspaceId!,
      createdAt: now,
      updatedAt: now,
    } as never);
    res.status(201).json({ productionPlan: plan });
  }),
);

// GET /production-plans/:id
productionRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const plan = await ps.getProductionPlan(pool, req.workspaceId!, req.params.id);
    if (!plan) throw new ApiError(404, 'NOT_FOUND', 'Production plan not found');
    res.json({ productionPlan: plan });
  }),
);

// GET /production-plans/:id/fabric-consumption
productionRoutes.get(
  '/:id/fabric-consumption',
  asyncHandler(async (req, res) => {
    const plan = await ps.getProductionPlan(pool, req.workspaceId!, req.params.id);
    if (!plan) throw new ApiError(404, 'NOT_FOUND', 'Production plan not found');
    res.json({ fabricConsumption: plan.fabricConsumption });
  }),
);

// GET /production-plans/:id/purchasing
productionRoutes.get(
  '/:id/purchasing',
  asyncHandler(async (req, res) => {
    const plan = await ps.getProductionPlan(pool, req.workspaceId!, req.params.id);
    if (!plan) throw new ApiError(404, 'NOT_FOUND', 'Production plan not found');
    if (!plan.purchasingRecommendation) throw new ApiError(404, 'NOT_FOUND', 'No purchasing recommendation found');
    res.json({ recommendation: plan.purchasingRecommendation });
  }),
);

// GET /production-plans/:id/readiness
productionRoutes.get(
  '/:id/readiness',
  asyncHandler(async (req, res) => {
    const plan = await ps.getProductionPlan(pool, req.workspaceId!, req.params.id);
    if (!plan) throw new ApiError(404, 'NOT_FOUND', 'Production plan not found');
    res.json({ readiness: plan.readiness });
  }),
);

// GET /production-plans/:id/traceability
productionRoutes.get(
  '/:id/traceability',
  asyncHandler(async (req, res) => {
    const plan = await ps.getProductionPlan(pool, req.workspaceId!, req.params.id);
    if (!plan) throw new ApiError(404, 'NOT_FOUND', 'Production plan not found');
    res.json({ traceability: plan.traceability });
  }),
);

// PATCH /production-plans/:id/operations/:operationId
productionRoutes.patch(
  '/:id/operations/:operationId',
  validate(z.object({
    body: z.object({
      status: z.enum(['not_started','ready','in_progress','completed','blocked','skipped']),
      notes: z.string().nullable().optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const { id, operationId } = req.params;
    await ps.updateOperationStatus(pool, req.workspaceId!, id, operationId, req.body.status, req.body.notes);
    const plan = await ps.getProductionPlan(pool, req.workspaceId!, id);
    if (!plan) throw new ApiError(404, 'NOT_FOUND', 'Production plan not found');
    res.json({ productionPlan: plan });
  }),
);

// PATCH /production-plans/:id/quality/:checkpointId
productionRoutes.patch(
  '/:id/quality/:checkpointId',
  validate(z.object({
    body: z.object({
      status: z.enum(['pending','passed','failed','needs_rework','skipped']),
      failureReason: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  })),
  asyncHandler(async (req, res) => {
    const { id, checkpointId } = req.params;
    await ps.updateQualityCheckpoint(pool, req.workspaceId!, id, checkpointId,
      req.body.status, req.body.failureReason, req.body.notes);
    const plan = await ps.getProductionPlan(pool, req.workspaceId!, id);
    if (!plan) throw new ApiError(404, 'NOT_FOUND', 'Production plan not found');
    res.json({ productionPlan: plan });
  }),
);
