import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@shared/utils/apiError';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
}
