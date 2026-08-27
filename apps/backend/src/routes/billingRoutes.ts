/**
 * Phase 5: commercial API routes.
 *
 * Endpoint security disposition (docs/PHASE5_BILLING_ENDPOINT_SECURITY.md):
 *   GET  /billing/plans         PUBLIC BY DESIGN (marketing catalogue,
 *                               no tenant data, rate-limited)
 *   GET  /billing/subscription  auth + workspace membership
 *   GET  /billing/entitlements  auth + workspace membership
 *   POST /billing/checkout      auth + workspace + owner/admin role
 *   POST /billing/cancel        auth + workspace + owner/admin role
 *   POST /billing/webhook       signature-verified (provider HMAC), no JWT
 *                               — authenticity comes from the signature,
 *                               dedicated lenient rate limit so legitimate
 *                               provider retries are not broken.
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import { requireWorkspace } from '../middleware/workspace';
import { requireWorkspaceRole } from '../middleware/requireWorkspaceRole';
import { billingRateLimit, webhookRateLimit } from '../config/rateLimit';
import { PLAN_CATALOGUE } from '../billing/plans';
import { entitlementService } from '../services/entitlementService';
import { billingService } from '../services/billingService';
import { subscriptionRepository, type SubscriptionRow } from '../repositories/subscriptionRepository';
import { resolveEffectiveStatus } from '../services/entitlementService';

const manageBilling = requireWorkspaceRole('owner', 'admin');

const billingRoutes = Router();

/** Public plan catalogue — safe to expose (no secrets, no tenant data). */
billingRoutes.get(
  '/plans',
  billingRateLimit,
  asyncHandler(async (_req, res) => {
    res.json({ plans: Object.values(PLAN_CATALOGUE) });
  })
);

/** Sanitized subscription view: provider internals are not exposed. */
function toSubscriptionDto(sub: SubscriptionRow) {
  return {
    plan: sub.plan_code,
    status: sub.status,
    effectiveStatus: resolveEffectiveStatus(sub),
    trialStart: sub.trial_start,
    trialEnd: sub.trial_end,
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    cancelledAt: sub.cancelled_at,
  };
}

billingRoutes.get(
  '/subscription',
  billingRateLimit,
  authMiddleware,
  requireWorkspace,
  asyncHandler(async (req, res) => {
    const sub = await subscriptionRepository.findLatestForWorkspace(req.workspaceId!);
    res.json({ subscription: sub ? toSubscriptionDto(sub) : null });
  })
);

billingRoutes.get(
  '/entitlements',
  billingRateLimit,
  authMiddleware,
  requireWorkspace,
  asyncHandler(async (req, res) => {
    const entitlements = await entitlementService.resolveEntitlements(req.workspaceId!);
    res.json(entitlements);
  })
);

billingRoutes.post(
  '/checkout',
  billingRateLimit,
  authMiddleware,
  requireWorkspace,
  manageBilling,
  asyncHandler(async (req, res) => {
    // Server-authoritative: workspace comes from the verified membership,
    // NEVER from the request body. Only planCode is read from the client
    // and it is strictly validated against the catalogue.
    const session = await billingService.initiateCheckout({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      userEmail: req.user!.email,
      planCode: String(req.body?.planCode ?? ''),
    });
    res.status(201).json(session);
  })
);

billingRoutes.post(
  '/cancel',
  billingRateLimit,
  authMiddleware,
  requireWorkspace,
  manageBilling,
  asyncHandler(async (req, res) => {
    const updated = await billingService.cancelSubscription(req.workspaceId!, req.user!.sub);
    res.json({ subscription: toSubscriptionDto(updated) });
  })
);

/**
 * Provider webhook. Authenticity = HMAC signature over the RAW body
 * (captured by the express.json verify hook in app.ts). No JWT — the
 * provider is not a StitchFlow user. Unsigned payload fields are never
 * trusted to select a workspace.
 */
billingRoutes.post(
  '/webhook',
  webhookRateLimit,
  asyncHandler(async (req, res) => {
    const signature =
      (req.headers['x-paystack-signature'] as string | undefined) ??
      (req.headers['x-billing-signature'] as string | undefined);
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const outcome = await billingService.processWebhook(rawBody, signature);
    res.status(200).json(outcome);
  })
);

export { billingRoutes };
