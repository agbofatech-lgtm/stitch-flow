import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { workspaceRepository } from '../repositories/workspaceRepository';

/**
 * Tenant boundary enforcement.
 *
 * The JWT names a workspace, but the token is NOT the sole authorization
 * mechanism: membership is re-verified against workspace_users on every
 * request, so revoked members lose access even with a live access token.
 *
 * Chain: JWT -> user -> workspace membership -> req.workspaceId scope.
 */
export async function requireWorkspace(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Unauthorized'));
    }

    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return next(
        new ApiError(403, 'NO_WORKSPACE', 'Authenticated user has no active workspace')
      );
    }

    const membership = await workspaceRepository.findMembership(workspaceId, req.user.sub);
    if (!membership) {
      return next(
        new ApiError(403, 'NOT_A_MEMBER', 'User is not a member of the requested workspace')
      );
    }

    req.workspaceId = workspaceId;
    req.workspaceRole = membership.role;
    next();
  } catch (err) {
    next(err);
  }
}
