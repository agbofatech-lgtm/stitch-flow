import { Request, Response, NextFunction } from 'express';
import { metrics } from '../config/observability/metrics';

/**
 * HTTP metrics middleware (Phase 6).
 *
 * Records request count, response count, 4xx/5xx split, and latency per
 * request — plus coarse failure classification by route class:
 *   /auth/*            → auth.failures      (401/403)
 *   /sync/*            → sync.failures      (4xx/5xx)
 *   /payments/*        → payment.failures   (4xx/5xx)
 *   /billing/webhook   → webhook.failures   (4xx/5xx)
 * No payloads or identifiers are captured.
 */
export function httpMetrics(req: Request, res: Response, next: NextFunction): void {
  metrics.requests.inc();
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    metrics.latency.observe(Math.round(durationMs * 100) / 100);
    metrics.responses.inc();

    const status = res.statusCode;
    if (status >= 400 && status < 500) metrics.http4xx.inc();
    if (status >= 500) metrics.http5xx.inc();

    const path = req.path || '/';
    if (status >= 400) {
      if (path.startsWith('/auth') && (status === 401 || status === 403)) {
        metrics.authFailures.inc();
      } else if (path.startsWith('/sync')) {
        metrics.syncFailures.inc();
      } else if (path.startsWith('/payments')) {
        metrics.paymentFailures.inc();
      } else if (path.startsWith('/billing/webhook')) {
        metrics.webhookFailures.inc();
      }
    }
  });

  next();
}
