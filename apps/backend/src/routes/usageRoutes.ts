import { Router } from 'express';
// Mounted behind authMiddleware + requireWorkspace in app.ts.

import { usageService } from '../services/usageService';
import { errorService } from '../services/errorService';

/**
 * Phase 7 — Product Usage Intelligence endpoints (workspace-scoped).
 * Ingest is idempotent-friendly, bounded (max 200 events/batch), and
 * strips sensitive-looking metadata keys. Failure here NEVER blocks core
 * business flows (analytics is subordinate — Step 25).
 */
export const usageRoutes = Router();

usageRoutes.post('/events', async (req, res) => {
  try {
    const result = await usageService.ingest(req.workspaceId!, req.user!.sub, req.body?.events);
    res.status(202).json(result);
  } catch {
    // Analytics ingest must never 5xx loudly — acknowledge and drop.
    res.status(202).json({ accepted: 0, rejected: -1, reason: 'ingest-failed' });
  }
});

usageRoutes.get('/summary', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days ?? '30'), 10) || 30, 1), 90);
    res.json(await usageService.workspaceSummary(req.workspaceId!, days));
  } catch {
    res.status(500).json({ message: 'Failed to summarize usage' });
  }
});

usageRoutes.get('/signals', async (req, res) => {
  try {
    res.json(await usageService.healthSignals(req.workspaceId!));
  } catch {
    res.status(500).json({ message: 'Failed to compute signals' });
  }
});

usageRoutes.post('/errors', async (req, res) => {
  try {
    const fingerprint = await errorService.record({
      workspaceId: req.workspaceId!,
      userId: req.user!.sub,
      requestId: typeof req.body?.requestId === 'string' ? req.body.requestId : null,
      errorCode: String(req.body?.errorCode ?? 'UNKNOWN'),
      route: typeof req.body?.route === 'string' ? req.body.route : null,
      feature: typeof req.body?.feature === 'string' ? req.body.feature : null,
      appVersion: typeof req.body?.appVersion === 'string' ? req.body.appVersion : null,
      platform: typeof req.body?.platform === 'string' ? req.body.platform : null,
      severity: ['warning', 'error', 'fatal'].includes(req.body?.severity) ? req.body.severity : 'error',
      message: String(req.body?.message ?? 'Unknown client error').slice(0, 500),
      metadata: typeof req.body?.metadata === 'object' && req.body.metadata ? req.body.metadata : {},
    });
    res.status(202).json({ fingerprint });
  } catch {
    res.status(202).json({ fingerprint: null, reason: 'error-report-failed' });
  }
});

usageRoutes.get('/errors', async (req, res) => {
  try {
    res.json(await errorService.listRecent({ workspaceId: req.workspaceId!, limit: 50 }));
  } catch {
    res.status(500).json({ message: 'Failed to list errors' });
  }
});
