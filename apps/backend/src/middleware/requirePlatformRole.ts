import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

/**
 * Phase 7 — platform-role boundary (Step 39).
 *
 * PLATFORM_* roles are DISTINCT from workspace roles (owner/admin/staff in
 * workspace_users). A workspace OWNER has NO platform privileges. The
 * legacy site 'admin' role is treated as platform_owner for bootstrap
 * continuity (the seeded operator account) — this is documented and
 * intentional, and workspace owners/staff never hold it.
 */
export const PLATFORM_ROLES = [
  'platform_owner',
  'platform_admin',
  'platform_support',
  'platform_analyst',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

const READ_ROLES: PlatformRole[] = ['platform_owner', 'platform_admin', 'platform_support', 'platform_analyst'];
const WRITE_ROLES: PlatformRole[] = ['platform_owner', 'platform_admin'];
const OPERATE_ROLES: PlatformRole[] = ['platform_owner', 'platform_admin', 'platform_support'];

export function requirePlatformRole(level: 'read' | 'write' | 'operate') {
  const allowed: string[] =
    level === 'read' ? READ_ROLES : level === 'operate' ? OPERATE_ROLES : WRITE_ROLES;
  // Legacy site admin = bootstrap platform owner (documented).
  allowed.push('admin');

  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role as string | undefined;
    if (!role) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Unauthorized'));
    }
    if (!allowed.includes(role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'Platform role required'));
    }
    next();
  };
}
