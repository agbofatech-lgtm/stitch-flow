import type { NextFunction, Request, Response } from 'express';
import { parseBearer, verifyAccessToken } from '../platform/tokens';
import type { PlatformRuntime } from '../platform/runtime';
import { PlatformError } from '../platform/runtime';

function platformOf(req: Request): PlatformRuntime {
  return req.app.locals.platform as PlatformRuntime;
}

export function requireIdentity(req: Request, res: Response, next: NextFunction): void {
  const parsed = verifyAccessToken(parseBearer(req.headers.authorization));
  if (!parsed.ok) {
    const map = {
      missing: [401, 'MISSING_TOKEN', 'Authentication required'],
      malformed: [401, 'MALFORMED_TOKEN', 'Token is malformed'],
      invalid: [401, 'INVALID_TOKEN', 'Token is invalid'],
      expired: [401, 'EXPIRED_TOKEN', 'Token has expired'],
    } as const;
    const [status, code, message] = map[parsed.reason];
    res.status(status).json({ error: code, message });
    return;
  }

  try {
    const runtime = platformOf(req);
    const identity = runtime.getIdentity(parsed.identityId);
    req.platformIdentityId = identity.id;
    next();
  } catch (err) {
    if (err instanceof PlatformError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    next(err);
  }
}

export function requirePlatformOperator(req: Request, res: Response, next: NextFunction): void {
  const identityId = req.platformIdentityId;
  if (!identityId) {
    res.status(401).json({ error: 'MISSING_TOKEN', message: 'Authentication required' });
    return;
  }
  if (!platformOf(req).isPlatformOperator(identityId)) {
    res.status(403).json({
      error: 'PLATFORM_ADMIN_REQUIRED',
      message: 'Tenant members cannot access the AGBOFA Control Center',
    });
    return;
  }
  next();
}

export function requireTenantContext(req: Request, res: Response, next: NextFunction): void {
  const identityId = req.platformIdentityId;
  if (!identityId) {
    res.status(401).json({ error: 'MISSING_TOKEN', message: 'Authentication required' });
    return;
  }
  const hinted =
    (typeof req.headers['x-tenant-id'] === 'string' && req.headers['x-tenant-id']) ||
    undefined;
  try {
    req.platformContext = platformOf(req).resolveContext(identityId, hinted);
    next();
  } catch (err) {
    if (err instanceof PlatformError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    next(err);
  }
}
