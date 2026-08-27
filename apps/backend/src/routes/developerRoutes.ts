import { Router } from 'express';
import { apiKeyService } from '../services/apiKeyService';
import { auditLogService } from '../services/auditLogService';
import { requireFeatureFlag } from '../middleware/requireFeatureFlag';
import { developerRateLimit } from '../config/rateLimit';
import { ENFORCEABLE_SCOPES, RESERVED_SCOPES, isReservedScope } from '../security/apiScopes';

/**
 * Phase 8 — Developer API-key management (§12/§31).
 * Mounted at /developers behind authMiddleware + requireWorkspace (JWT staff
 * only — API keys themselves cannot manage keys, portal tokens are rejected
 * by audience). Every mutation is audited with actor + workspace + requestId
 * (auto-filled from the request correlation context).
 */
export const developerRoutes = Router();
developerRoutes.use(requireFeatureFlag('DEVELOPER_API'));

developerRoutes.post('/keys', developerRateLimit, async (req, res) => {
  const ws = req.workspaceId!;
  const name = String(req.body?.name ?? '').trim();
  if (!name || name.length > 100) {
    return res.status(400).json({ message: 'name (1–100 chars) is required' });
  }
  const scopes = req.body?.scopes;
  if (Array.isArray(scopes) && scopes.some(isReservedScope)) {
    return res.status(400).json({
      message: 'Reserved scope requested',
      reserved: RESERVED_SCOPES,
      hint: 'Reserved scopes become grantable when their subsystem ships; grantable scopes are listed in "enforceable"',
    });
  }
  let created;
  try {
    created = await apiKeyService.create({
      workspaceId: ws,
      createdBy: req.user!.sub,
      name,
      scopes,
      expiresAt: req.body?.expiresAt,
    });
  } catch (err) {
    console.error('developers: key create failed:', err);
    return res.status(500).json({ message: 'Failed to create API key' });
  }
  if (!created.ok) {
    const code = created.code === 'INVALID_EXPIRATION' ? 'expiresAt must be an ISO-8601 timestamp' : 'scopes must be a non-empty array of known scopes';
    return res.status(400).json({ message: code, enforceable: ENFORCEABLE_SCOPES });
  }
  void auditLogService
    .log({
      userId: req.user!.sub,
      workspaceId: ws,
      action: 'api_key.created',
      entityType: 'api_key',
      entityId: created.key.id,
      metadata: { name, scopes: created.key.scopes, keyPrefix: created.key.key_prefix, expiresAt: created.key.expires_at },
    })
    .catch(() => undefined);
  // ONE-TIME secret display: never retrievable again.
  return res.status(201).json({ key: created.key, secret: created.secret });
});

developerRoutes.get('/keys', async (req, res) => {
  try {
    res.json(await apiKeyService.list(req.workspaceId!));
  } catch (err) {
    console.error('developers: key list failed:', err);
    res.status(500).json({ message: 'Failed to list API keys' });
  }
});

developerRoutes.post('/keys/:id/revoke', async (req, res) => {
  let outcome;
  try {
    outcome = await apiKeyService.revoke(req.workspaceId!, req.params.id, req.user!.sub);
  } catch (err) {
    console.error('developers: key revoke failed:', err);
    return res.status(500).json({ message: 'Failed to revoke API key' });
  }
  if (outcome === 'not_found') return res.status(404).json({ message: 'API key not found' });
  if (outcome === 'already_revoked') return res.status(409).json({ code: 'KEY_ALREADY_REVOKED', message: 'API key already revoked' });
  void auditLogService
    .log({
      userId: req.user!.sub,
      workspaceId: req.workspaceId!,
      action: 'api_key.revoked',
      entityType: 'api_key',
      entityId: req.params.id,
      metadata: { revokedVia: 'developers-console' },
    })
    .catch(() => undefined);
  res.json({ revoked: true, id: req.params.id });
});

developerRoutes.patch('/keys/:id/scopes', async (req, res) => {
  const scopes = req.body?.scopes;
  if (Array.isArray(scopes) && scopes.some(isReservedScope)) {
    return res.status(400).json({ message: 'Reserved scope requested', reserved: RESERVED_SCOPES });
  }
  let outcome;
  try {
    outcome = await apiKeyService.setScopes(req.workspaceId!, req.params.id, scopes);
  } catch (err) {
    console.error('developers: scope update failed:', err);
    return res.status(500).json({ message: 'Failed to update scopes' });
  }
  if (outcome === 'invalid') {
    return res.status(400).json({ message: 'scopes must be a non-empty array of known scopes', enforceable: ENFORCEABLE_SCOPES });
  }
  if (outcome === 'not_found') return res.status(404).json({ message: 'API key not found' });
  if (outcome === 'not_active') return res.status(409).json({ code: 'KEY_NOT_ACTIVE', message: 'Only active keys can be re-scoped' });
  void auditLogService
    .log({
      userId: req.user!.sub,
      workspaceId: req.workspaceId!,
      action: 'api_key.scopes_changed',
      entityType: 'api_key',
      entityId: req.params.id,
      metadata: { scopes },
    })
    .catch(() => undefined);
  res.json({ id: req.params.id, scopes });
});

/** Scope catalogue for UIs (enforceable now vs reserved for later subsystems). */
developerRoutes.get('/scopes', (_req, res) => {
  res.json({ enforceable: ENFORCEABLE_SCOPES, reserved: RESERVED_SCOPES });
});
