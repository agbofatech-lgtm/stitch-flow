import type { NextFunction, Request, Response } from 'express';
import type { PlatformRuntime } from '../platform/runtime';
import { PlatformError } from '../platform/errors';

function platformOf(req: Request): PlatformRuntime {
  return req.app.locals.platform as PlatformRuntime;
}

/**
 * After requireIdentity + requireTenantContext.
 * Client may hint X-Workspace-Id; server verifies workspace belongs to authorized tenant.
 */
export function requireShopWorkspace(req: Request, res: Response, next: NextFunction): void {
  const ctx = req.platformContext;
  if (!ctx) {
    res.status(401).json({ error: 'MISSING_CONTEXT', message: 'Tenant context missing' });
    return;
  }
  const hinted =
    (typeof req.headers['x-workspace-id'] === 'string' && req.headers['x-workspace-id']) ||
    ctx.workspace.id;
  const runtime = platformOf(req);
  const workspace = [...runtime.store.workspaces.values()].find((row) => row.id === hinted);
  if (!workspace || workspace.tenantId !== ctx.tenant.id) {
    const err = new PlatformError(403, 'WORKSPACE_SCOPE', 'Workspace is not in the authorized tenant');
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  req.shopWorkspaceId = workspace.id;
  next();
}
