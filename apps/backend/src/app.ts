import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { requestCorrelation } from './middleware/requestCorrelation';
import { httpMetrics } from './middleware/httpMetrics';
import { apiRateLimit } from './config/rateLimit';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes/index';
import { authMiddleware } from './middleware/auth';
import { requireWorkspace } from './middleware/workspace';
import { dashboardRoutes } from './routes/dashboardRoutes';
import { customerRoutes } from './routes/customerRoutes';
import measurementRoutes, { definitionRoutes } from './routes/measurementRoutes';
import {
  assetRoutes,
  inspirationRoutes,
  fabricProfileRoutes,
  designSpecRoutes,
} from './routes/designRoutes';
import { patternModelRoutes, cuttingLayoutRoutes } from './routes/patternRoutes';
import { productionRoutes } from './routes/productionRoutes';
import { orderRoutes } from './routes/orderRoutes';
import { invoiceRoutes } from './routes/invoiceRoutes';
import { paymentRoutes } from './routes/paymentRoutes';
import { materialRoutes } from './routes/materialRoutes';
import { reportRoutes } from './routes/reportRoutes';
import { settingsRoutes } from './routes/settingsRoutes';
import { billingRoutes } from './routes/billingRoutes';
import { crmRoutes } from './routes/crmRoutes';
import { referralRoutes } from './routes/referralRoutes';
import { appointmentRoutes } from './routes/appointmentRoutes';
import { usageRoutes } from './routes/usageRoutes';
import { supportRoutes } from './routes/supportRoutes';
import { platformRoutes } from './routes/platformRoutes';
import { portalLoginRoutes, portalRoutes } from './routes/portalRoutes';
import { developerRoutes } from './routes/developerRoutes';
import { apiV1Routes } from './routes/apiV1Routes';
import { webhookRoutes } from './routes/webhookRoutes';

/**
 * Canonical StitchFlow Express application.
 *
 * Single execution path: server.ts boots this app. The previous mock server
 * (hardcoded data) has been removed from the runtime path.
 */
export const app = express();

/**
 * CORS is environment-driven (Phase 4):
 * - production: explicit comma-separated allowlist from CORS_ORIGIN — no
 *   wildcard/reflected origins;
 * - development/test: permissive to support local dev + sandbox previews.
 */
const corsOrigin =
  env.NODE_ENV === 'production'
    ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(helmet());

// Observability first so every request (including failures) is counted.
app.use(httpMetrics);

// Correlation id for every request (works with pino-http + error handler).
app.use(requestCorrelation);

// Raw body is captured for billing webhook signature verification
// (Phase 5). Behavior of JSON parsing is otherwise unchanged.
app.use(
  express.json({
    limit: process.env.MAX_PAYLOAD_SIZE || '1mb',
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  })
);

if (env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

app.get('/', (_req, res) => {
  res.json({
    message: 'StitchFlow backend is running',
  });
});

// General request-storm protection (auth/sync/etc. keep their own stricter limits)
app.use(apiRateLimit);

// Platform routes: auth, licenses, events, feature-requests, sync, admin, health
app.use('/', apiRoutes);

// Business routes: authenticated + tenant-scoped (Phase 3).
// JWT -> user -> workspace membership -> req.workspaceId -> scoped SQL.
app.use('/dashboard', authMiddleware, requireWorkspace, dashboardRoutes);
app.use('/customers', authMiddleware, requireWorkspace, customerRoutes);
app.use('/customers/:customerId/measurement-profiles', authMiddleware, requireWorkspace, measurementRoutes);
app.use('/measurement-definitions', authMiddleware, requireWorkspace, definitionRoutes);
// Phase 14 — Design Intelligence routes
app.use('/local-assets', authMiddleware, requireWorkspace, assetRoutes);
app.use('/customers/:customerId/inspirations', authMiddleware, requireWorkspace, inspirationRoutes);
app.use('/fabric-profiles', authMiddleware, requireWorkspace, fabricProfileRoutes);
app.use('/customers/:customerId/design-specifications', authMiddleware, requireWorkspace, designSpecRoutes);
// Phase 15 — Pattern & Cutting Intelligence
app.use('/customers/:customerId/pattern-models', authMiddleware, requireWorkspace, patternModelRoutes);
app.use('/customers/:customerId/cutting-layouts', authMiddleware, requireWorkspace, cuttingLayoutRoutes);
// Phase 16 — Fabric & Production Intelligence
app.use('/production-plans', authMiddleware, requireWorkspace, productionRoutes);
app.use('/orders', authMiddleware, requireWorkspace, orderRoutes);
app.use('/invoices', authMiddleware, requireWorkspace, invoiceRoutes);
app.use('/payments', authMiddleware, requireWorkspace, paymentRoutes);
app.use('/materials', authMiddleware, requireWorkspace, materialRoutes);
app.use('/reports', authMiddleware, requireWorkspace, reportRoutes);
app.use('/settings', authMiddleware, requireWorkspace, settingsRoutes);

// Phase 7: customer experience / CRM / growth domains — authenticated +
// workspace-scoped like the other business routes.
app.use('/crm', authMiddleware, requireWorkspace, crmRoutes);
app.use('/referrals', authMiddleware, requireWorkspace, referralRoutes);
app.use('/appointments', authMiddleware, requireWorkspace, appointmentRoutes);

// Phase 7 — usage intelligence + support (workspace-scoped).
app.use('/usage', authMiddleware, requireWorkspace, usageRoutes);
app.use('/support', authMiddleware, requireWorkspace, supportRoutes);

// Phase 7 — developer control plane (PLATFORM roles only; legacy site
// 'admin' counts as bootstrap platform_owner, workspace roles never do).
app.use('/platform', platformRoutes);

// Phase 7 — customer portal: SEPARATE auth boundary (portal audience).
app.use('/portal', portalLoginRoutes, portalRoutes);

// Phase 8 — developer control plane: API-key management (staff JWT only)
// and the versioned, API-key-authenticated Developer API. Both fail closed
// while the DEVELOPER_API feature flag is OFF.
app.use('/developers', authMiddleware, requireWorkspace, developerRoutes);
app.use('/api/v1', apiV1Routes);

// Phase 8 — webhook management (workspace staff; WEBHOOK_MANAGEMENT flag).
app.use('/webhooks', authMiddleware, requireWorkspace, webhookRoutes);

// Commercial routes (Phase 5): per-route middleware — the webhook is
// signature-verified rather than JWT-authenticated; everything else is
// authenticated + workspace-scoped inside billingRoutes.
app.use('/billing', billingRoutes);

app.use(notFound);
app.use(errorHandler);
