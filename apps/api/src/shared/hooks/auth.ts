import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@shared/utils/apiError';
import { verifyAccessToken } from '@shared/utils/jwt';

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing bearer token'));
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token'));
  }
}
