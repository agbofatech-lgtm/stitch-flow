import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { logger } from '../config/logger';

/**
 * Error taxonomy (Phase 6): framework errors that carry an HTTP status
 * (body-parser `entity.too.large`, malformed-JSON parse errors, http-errors)
 * are mapped to stable codes instead of collapsing into a sanitized 500 —
 * clients can distinguish their bad request from our failure.
 */
function frameworkErrorToApiError(err: Error): ApiError | null {
  const status = (err as Error & { status?: number; statusCode?: number }).status ??
    (err as Error & { statusCode?: number }).statusCode;
  if (typeof status !== 'number' || status < 400 || status >= 500) return null;
  if (status === 413) {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request payload too large');
  }
  if (status === 400) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Malformed request body');
  }
  return new ApiError(status, 'BAD_REQUEST', 'Bad request');
}

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Correlation id from pino-http when present (observability §40); never
  // leaks internals — responses stay sanitized.
  const requestId = (req as Request & { id?: string | number }).id;

  const apiError =
    err instanceof ApiError ? err : frameworkErrorToApiError(err);

  if (apiError) {
    return res.status(apiError.statusCode).json({
      error: {
        code: apiError.code,
        message: apiError.message,
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
