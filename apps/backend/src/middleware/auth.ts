import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt';
import { setRequestContext } from '../config/observability/requestContext';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing bearer token'));
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    req.user = verifyAccessToken(token);
    // Phase 6: propagate correlation context for audit logging.
    setRequestContext({ actorId: req.user.sub });
    next();
  } catch {
    next(new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
  }
}
