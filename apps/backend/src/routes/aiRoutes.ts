/**
 * Phase 17 — AI Tailoring Intelligence API routes.
 *
 * Mounted in app.ts behind authMiddleware + requireWorkspace, exactly like
 * every other business route. AI inherits the existing security boundary;
 * it does not define its own.
 *
 * ROUTES
 *   GET  /ai/status                              provider availability
 *   POST /ai/measurement-review/:profileId       Phase 13 advisory
 *   POST /ai/design-review                       Phase 14 advisory
 *   POST /ai/fabric-review/:planId               Phase 16 fabric advisory
 *   POST /ai/production-review/:planId           Phase 16 production advisory
 *   POST /ai/explain                             customer-friendly wording
 *
 * DESIGN NOTES
 *  - All requests are POST (except status) because they are INTENTIONAL,
 *    user-triggered actions, never fired on page render (§25).
 *  - workspaceId always comes from req.workspaceId (server-derived).
 *  - Handlers never throw on AI failure: the gateway degrades instead.
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { ApiError } from '../utils/apiError';
import { pool } from '../config/db';
import { getProviderStatus } from '../modules/ai/aiGateway';
import * as advisor from '../modules/ai/tailoringAdvisor';
import { auditLogService } from '../services/auditLogService';
import type { AIAdvisory } from '../modules/ai/types';

export const aiRoutes = Router();

// ---------------------------------------------------------------------------
// Rate limiting — per workspace, in-memory, intentionally simple (§25)
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000;

/**
 * Read the limit lazily rather than at module load, so deployment config
 * (and tests) can change it without re-importing the module.
 */
function maxRequestsPerWindow(): number {
  const parsed = Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? '20');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(workspaceId: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(workspaceId);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(workspaceId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= maxRequestsPerWindow()) return false;
  bucket.count += 1;
  return true;
}

/** Exposed for tests so a suite can start from a clean limiter. */
export function resetAIRateLimits(): void {
  buckets.clear();
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function callerFrom(req: {
  workspaceId?: string;
  user?: { sub?: string };
  headers: Record<string, unknown>;
}): advisor.AdvisorCaller {
  const requestId = req.headers['x-request-id'];
  return {
    // Server-derived tenant. Never read from the body (§16).
    workspaceId: req.workspaceId as string,
    actorId: req.user?.sub ?? null,
    requestId: typeof requestId === 'string' ? requestId : null,
  };
}

/**
 * Audit metadata only — never the prompt, never the AI response body,
 * never customer context (§29: prefer minimal persistence).
 */
async function auditAdvisory(
  workspaceId: string,
  actorId: string | null,
  advisory: AIAdvisory,
): Promise<void> {
  try {
    await auditLogService.log({
      workspaceId,
      userId: actorId,
      action: `ai.${advisory.purpose}`,
      entityType: 'ai_advisory',
      entityId: advisory.provenance.requestId ?? null,
      metadata: {
        provider: advisory.provenance.provider,
        status: advisory.status,
        aiGenerated: advisory.aiGenerated,
        degraded: advisory.provenance.degraded,
        findingCount: advisory.findings.length,
        conflictCount: advisory.deterministicConflicts.length,
      },
    });
  } catch {
    // Audit must never break the advisory response.
  }
}

function guardRateLimit(workspaceId: string): void {
  if (!checkRateLimit(workspaceId)) {
    throw new ApiError(429, 'AI_RATE_LIMIT', 'AI request limit reached. Please try again shortly.');
  }
}

// ---------------------------------------------------------------------------
// GET /ai/status
// ---------------------------------------------------------------------------

aiRoutes.get(
  '/status',
  asyncHandler(async (_req, res) => {
    // Never leaks key material — only availability facts.
    res.json(getProviderStatus());
  }),
);

// ---------------------------------------------------------------------------
// POST /ai/measurement-review/:profileId
// ---------------------------------------------------------------------------

aiRoutes.post(
  '/measurement-review/:profileId',
  validate(z.object({ params: z.object({ profileId: z.string().uuid() }) })),
  asyncHandler(async (req, res) => {
    const caller = callerFrom(req as never);
    guardRateLimit(caller.workspaceId);

    const advisory = await advisor.reviewMeasurements(caller, req.params.profileId);
    await auditAdvisory(caller.workspaceId, caller.actorId, advisory);
    res.json(advisory);
  }),
);

// ---------------------------------------------------------------------------
// POST /ai/design-review
// ---------------------------------------------------------------------------

const designReviewSchema = z.object({
  body: z.object({
    designSpecificationId: z.string().min(1),
    garmentType: z.string().min(1),
    fitType: z.string().min(1),
    designStatus: z.string().min(1),
    components: z
      .array(z.object({ type: z.string(), label: z.string() }))
      .max(50)
      .default([]),
    easeConfiguration: z
      .array(z.object({ area: z.string(), easeCm: z.number(), source: z.string() }))
      .max(20)
      .default([]),
    readinessItems: z
      .array(z.object({ code: z.string(), status: z.string(), message: z.string() }))
      .max(50)
      .default([]),
    hasInspiration: z.boolean().default(false),
    observationCount: z.number().int().nonnegative().default(0),
  }),
});

aiRoutes.post(
  '/design-review',
  validate(designReviewSchema),
  asyncHandler(async (req, res) => {
    const caller = callerFrom(req as never);
    guardRateLimit(caller.workspaceId);

    const advisory = await advisor.reviewDesign(caller, req.body);
    await auditAdvisory(caller.workspaceId, caller.actorId, advisory);
    res.json(advisory);
  }),
);

// ---------------------------------------------------------------------------
// POST /ai/fabric-review/:planId
// ---------------------------------------------------------------------------

aiRoutes.post(
  '/fabric-review/:planId',
  validate(z.object({ params: z.object({ planId: z.string().min(1) }) })),
  asyncHandler(async (req, res) => {
    const caller = callerFrom(req as never);
    guardRateLimit(caller.workspaceId);

    const advisory = await advisor.reviewFabric(caller, pool, req.params.planId);
    if (!advisory) {
      throw new ApiError(404, 'PLAN_NOT_FOUND', 'Production plan not found');
    }
    await auditAdvisory(caller.workspaceId, caller.actorId, advisory);
    res.json(advisory);
  }),
);

// ---------------------------------------------------------------------------
// POST /ai/production-review/:planId
// ---------------------------------------------------------------------------

aiRoutes.post(
  '/production-review/:planId',
  validate(z.object({ params: z.object({ planId: z.string().min(1) }) })),
  asyncHandler(async (req, res) => {
    const caller = callerFrom(req as never);
    guardRateLimit(caller.workspaceId);

    const advisory = await advisor.reviewProduction(caller, pool, req.params.planId);
    if (!advisory) {
      throw new ApiError(404, 'PLAN_NOT_FOUND', 'Production plan not found');
    }
    await auditAdvisory(caller.workspaceId, caller.actorId, advisory);
    res.json(advisory);
  }),
);

// ---------------------------------------------------------------------------
// POST /ai/explain
// ---------------------------------------------------------------------------

const explainSchema = z.object({
  body: z.object({
    subjectId: z.string().min(1),
    topic: z.string().min(1).max(120),
    technicalStatements: z.array(z.string().min(1).max(1000)).min(1).max(20),
    garmentType: z.string().max(60).nullable().optional(),
  }),
});

aiRoutes.post(
  '/explain',
  validate(explainSchema),
  asyncHandler(async (req, res) => {
    const caller = callerFrom(req as never);
    guardRateLimit(caller.workspaceId);

    const advisory = await advisor.explainForCustomer(
      caller,
      req.body.subjectId,
      req.body.topic,
      req.body.technicalStatements,
      req.body.garmentType ?? null,
    );
    await auditAdvisory(caller.workspaceId, caller.actorId, advisory);
    res.json(advisory);
  }),
);

export default aiRoutes;
