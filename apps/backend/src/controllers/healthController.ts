import { Request, Response } from 'express';
import { testDbConnection } from '../config/db';
import { versionInfo, STARTED_AT, uptimeSeconds } from '../config/version';

/**
 * Health endpoints (Phase 6):
 * - GET /health          general application health (legacy contract: status ok)
 * - GET /health/live     liveness — is the process alive (no dependency checks)
 * - GET /health/ready    readiness — are dependencies (database) able to serve
 * - GET /health/version  authoritative version metadata (no secrets)
 */

const DB_PROBE_TIMEOUT_MS = 2000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
    // Never keep the process (or its shutdown) alive for a health probe timer.
    timer.unref?.();
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function checkDatabase(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await withTimeout(testDbConnection(), DB_PROBE_TIMEOUT_MS);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'database unavailable' };
  }
}

export const healthController = {
  /** General health — process meta + version. Does not fail on DB outage. */
  async check(_req: Request, res: Response) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: versionInfo.version,
      uptimeSeconds: uptimeSeconds(),
    });
  },

  /** Liveness — cheapest possible signal for orchestrators. */
  async live(_req: Request, res: Response) {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  },

  /** Readiness — 200 only when required dependencies can serve traffic. */
  async ready(_req: Request, res: Response) {
    const database = await checkDatabase();
    if (database.ok) {
      res.status(200).json({
        status: 'ready',
        checks: { database: 'up', latencyMs: database.latencyMs },
        timestamp: new Date().toISOString(),
      });
    } else {
      // Deliberately does not echo raw driver error text (may contain DSN host).
      res.status(503).json({
        status: 'unavailable',
        checks: { database: 'down' },
        timestamp: new Date().toISOString(),
      });
    }
  },

  /** Authoritative version — safe metadata only. */
  async version(_req: Request, res: Response) {
    res.json({
      version: versionInfo.version,
      ...(versionInfo.commit ? { commit: versionInfo.commit } : {}),
      startedAt: STARTED_AT,
      uptimeSeconds: uptimeSeconds(),
      node: process.version,
      env: process.env.NODE_ENV || 'development',
    });
  },
};
