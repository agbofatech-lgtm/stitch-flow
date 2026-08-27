import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContextStorage } from '../config/observability/requestContext';

/**
 * Request correlation (Phase 6, Step 11).
 *
 * Every request gets exactly one correlation id:
 *   incoming X-Request-Id (validated: safe charset + bounded length) OR
 *   freshly generated UUID.
 *
 * - Echoed back on the response as X-Request-Id.
 * - pino-http picks up the pre-set req.id, so structured request logs,
 *   the error handler's `requestId` field, and the response header all
 *   share the same value.
 * - AsyncLocalStorage carries the id (+ later workspace/actor context set
 *   by requireWorkspace/authMiddleware) into audit logging.
 * - The id is correlation-only: it is never used for authentication,
 *   authorization, or tenant resolution, and hostile/oversized values are
 *   replaced rather than trusted (log-injection safe).
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

// req.id typing lives in src/types/express.d.ts (Phase 6).

export function requestCorrelation(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming)
      ? incoming
      : randomUUID();

  req.id = id;
  res.setHeader('X-Request-Id', id);

  requestContextStorage.run({ requestId: id }, () => next());
}
