import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Correlation id from pino-http when present (observability §40); never
  // leaks internals — responses stay sanitized.
  const requestId = (req as Request & { id?: string | number }).id;

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(requestId !== undefined ? { requestId: String(requestId) } : {})
      }
    });
  }

  logger.error({ err, requestId }, 'unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
      ...(requestId !== undefined ? { requestId: String(requestId) } : {})
    }
  });
}
