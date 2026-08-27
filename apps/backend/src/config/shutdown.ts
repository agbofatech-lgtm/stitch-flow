import type { Server } from 'http';
import { pool } from './db';
import { logger } from './logger';

/**
 * Graceful shutdown (Phase 6).
 *
 * Sequence on SIGTERM/SIGINT:
 *   1. stop accepting new connections        (server.close)
 *   2. finish safe in-flight work            (idle sockets closed; wait grace)
 *   3. close the database pool               (pool.end — drains cleanly)
 *   4. exit 0
 *
 * A hard timeout (SHUTDOWN_TIMEOUT_MS, default 10s) force-exits so an
 * orchestrator is never left waiting on a stuck connection; exit code 1 on
 * forced exit so the supervisor sees the incomplete drain.
 */
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || '10000');

export function registerGracefulShutdown(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'graceful shutdown initiated');

    const forceTimer = setTimeout(() => {
      logger.error({ signal }, 'graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref?.();

    // 1 + 2: stop accepting new connections; close keep-alive idle sockets.
    server.close(() => {
      logger.info('http server closed — no new requests accepted');
    });
    // Close keep-alive idle sockets so in-flight-only work remains (Node >= 18.2).
    if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();

    // 3: drain the pool (waits for in-flight queries to finish).
    pool
      .end()
      .then(() => {
        logger.info('database pool closed cleanly');
        clearTimeout(forceTimer);
        process.exit(0);
      })
      .catch((err) => {
        logger.error({ err: err instanceof Error ? err.message : err }, 'error closing database pool');
        clearTimeout(forceTimer);
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
