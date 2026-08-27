import { Request, Response, NextFunction } from 'express';
import { apiKeyService, type ApiKeyRow } from '../services/apiKeyService';
import { usageService } from '../services/usageService';
import { API_KEY_PREFIX_HEADER } from '../security/apiScopes';
import { ApiError } from '../utils/apiError';

/**
 * Phase 8 — scoped API-key authentication (§12/§13/§28).
 *
 * Accepts `X-API-Key: sf_live_…` or `Authorization: Bearer sf_live_…`
 * (JWT bearer tokens do not match the sf_live_ shape and are rejected).
 * Verification: prefix lookup + timing-safe SHA-256 comparison + status /
 * expiration checks. Scope enforcement is exact-set membership: EVERY
 * required scope must be granted; there is no wildcard scope.
 *
 * Side effects (both best-effort, never blocking the response):
 * - throttled last-used/request-count tracking (apiKeyService.touch)
 * - one bounded `api_request` usage event per call (method/path/status only;
 *   never the key itself, headers, query or body)
 */
declare module 'express-serve-static-core' {
  interface Request {
    apiKey?: Pick<ApiKeyRow, 'id' | 'workspace_id' | 'name' | 'key_prefix' | 'scopes' | 'status' | 'expires_at' | 'created_by'>;
  }
}

function extractKey(req: Request): string | null {
  const header = req.headers['x-api-key'];
  if (typeof header === 'string' && header.length > 0) return header;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ') && auth.slice(7).startsWith(API_KEY_PREFIX_HEADER)) {
    return auth.slice(7);
  }
  return null;
}

export function apiKeyAuth(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const presented = extractKey(req);
    if (!presented) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Missing API key'));
    }
    apiKeyService
      .verify(presented)
      .then((verification) => {
        if (!verification.ok) {
          const code =
            verification.code === 'REVOKED' ? 'API_KEY_REVOKED'
            : verification.code === 'EXPIRED' ? 'API_KEY_EXPIRED'
            : 'INVALID_API_KEY';
          return next(new ApiError(401, code, 'API key rejected'));
        }
        const key = verification.key;
        const missing = requiredScopes.filter((s) => !key.scopes.includes(s));
        if (missing.length > 0) {
          return next(new ApiError(403, 'INSUFFICIENT_SCOPE', `Missing required scope: ${missing.join(', ')}`));
        }
        req.apiKey = {
          id: key.id,
          workspace_id: key.workspace_id,
          name: key.name,
          key_prefix: key.key_prefix,
          created_by: key.created_by,
          scopes: key.scopes,
          status: key.status,
          expires_at: key.expires_at,
        };
        apiKeyService.touch(key.id);
        res.on('finish', () => {
          void usageService.recordApiCall({
            workspaceId: key.workspace_id,
            keyPrefix: key.key_prefix,
            method: req.method,
            path: req.path,
            status: res.statusCode,
          }).catch(() => undefined);
        });
        next();
      })
      .catch(() => next(new ApiError(401, 'INVALID_API_KEY', 'API key rejected')));
  };
}
