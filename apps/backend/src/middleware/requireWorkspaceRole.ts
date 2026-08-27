import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

/**
 * Workspace-level role enforcement (Phase 4). Uses the EXISTING role model
 * (workspace_users.role: owner | admin | assistant) resolved by
 * requireWorkspace — no roles are invented. Sensitive workspace
 * administration is restricted to owner/admin.
 */
export function requireWorkspaceRole(...roles: Array<'owner' | 'admin' | 'assistant'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !req.workspaceId) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Unauthorized'));
    }
    if (!req.workspaceRole || !roles.includes(req.workspaceRole)) {
      return next(
        new ApiError(403, 'FORBIDDEN_WORKSPACE_ROLE', 'Insufficient workspace role')
      );
    }
    next();
  };
}
