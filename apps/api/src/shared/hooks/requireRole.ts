import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@shared/utils/apiError';

export function requireRole(role: 'admin' | 'user') {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Unauthorized'));
    }

    if (req.user.role !== role) {
      return next(new ApiError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }

    next();
  };
}
