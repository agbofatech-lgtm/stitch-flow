import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requirePlatformRole } from '../middleware/requirePlatformRole';
import { usageService } from '../services/usageService';
import { errorService } from '../services/errorService';
import { featureFlagService, controlPlaneService } from '../services/platformServices';
import { auditLogService } from '../services/auditLogService';

/**
 * Phase 7 — Developer Control Plane (Step 27–29, 39, 58).
 * PLATFORM roles only; workspace owners/staff are FORBIDDEN here.
 */
export const platformRoutes = Router();
platformRoutes.use(authMiddleware);

platformRoutes.get('/overview', requirePlatformRole('read'), async (_req, res) => {
  const summary = await usageService.platformSummary(30);
  res.json(summary);
});

platformRoutes.get('/workspaces', requirePlatformRole('read'), async (req, res) => {
  res.json(await controlPlaneService.workspacesOverview(Number(req.query.limit ?? 100)));
});

platformRoutes.get('/feature-usage', requirePlatformRole('read'), async (req, res) => {
  res.json(await controlPlaneService.featureUsage(typeof req.query.feature === 'string' ? req.query.feature : undefined));
});

platformRoutes.get('/signals', requirePlatformRole('read'), async (_req, res) => {
  res.json(await usageService.healthSignals());
});

// ---------- Error center ----------
platformRoutes.get('/errors', requirePlatformRole('read'), async (_req, res) => {
  res.json(await errorService.listRecent({ limit: 100 }));
});

platformRoutes.get('/incidents', requirePlatformRole('read'), async (_req, res) => {
  res.json(await errorService.listIncidents());
});

platformRoutes.get('/incidents/:fingerprint/diagnosis', requirePlatformRole('read'), async (req, res) => {
  const diagnosis = await errorService.diagnose(req.params.fingerprint);
  if (!diagnosis) return res.status(404).json({ message: 'Incident not found' });
  res.json(diagnosis);
});

platformRoutes.patch('/incidents/:fingerprint', requirePlatformRole('operate'), async (req, res) => {
  const status = String(req.body?.status ?? '');
  const result = await errorService.updateIncidentStatus(req.params.fingerprint, status, req.user!.sub);
  if (!result.ok) return res.status(400).json({ message: 'Invalid status or unknown incident' });
  void auditLogService
    .log({ action: 'platform.incident_status_changed', entityType: 'incident', entityId: req.params.fingerprint, metadata: { status } })
    .catch(() => undefined);
  res.json(result);
});

// ---------- Feature flags (server-authoritative) ----------
platformRoutes.get('/flags', requirePlatformRole('read'), async (_req, res) => {
  res.json(await featureFlagService.list());
});

platformRoutes.patch('/flags/:key', requirePlatformRole('write'), async (req, res) => {
  try {
    const flag = await featureFlagService.set(req.params.key, req.body?.enabled === true, req.user!.sub);
    void auditLogService
      .log({ action: 'platform.feature_flag_changed', entityType: 'feature_flag', entityId: flag.flag_key, metadata: { enabled: flag.enabled } })
      .catch(() => undefined);
    res.json(flag);
  } catch {
    res.status(404).json({ message: 'Unknown feature flag' });
  }
});
