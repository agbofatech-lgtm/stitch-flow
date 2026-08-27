import { Request, Response, NextFunction } from 'express';
import { featureFlagService } from '../services/platformServices';
import { ApiError } from '../utils/apiError';

/**
 * Phase 8 — server-authoritative feature-flag gate (§25).
 * Flags are resolved from the platform-managed `feature_flags` table on
 * every request; the client is never trusted. Disabled features fail
 * closed with 403 FEATURE_DISABLED (no existence leak beyond the actor).
 */
export function requireFeatureFlag(flagKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const enabled = await featureFlagService.isEnabled(flagKey);
      if (!enabled) {
        return next(new ApiError(403, 'FEATURE_DISABLED', `Feature '${flagKey}' is disabled`));
      }
      next();
    } catch {
      // Fail closed: flag subsystem failure must not expose a gated surface.
      next(new ApiError(503, 'FEATURE_CHECK_FAILED', 'Feature state unavailable'));
    }
  };
}
