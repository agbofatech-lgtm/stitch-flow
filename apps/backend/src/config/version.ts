import { readFileSync } from 'fs';
import path from 'path';

/**
 * Single authoritative application version (Phase 6).
 *
 * Source of truth: `apps/backend/package.json` `version` (kept in lockstep
 * with the root manifest — both 1.0.0). Health endpoints, logs, and release
 * tooling must read the version from here so it cannot drift between the
 * process, the API surface, and package metadata.
 *
 * Optional DEPLOYMENT-ONLY env (never required, never secret):
 * - SOURCE_COMMIT  — git sha baked in by the deploy pipeline
 * - SOURCE_VERSION — override used only by release tooling to assert parity
 */
let cachedVersion: string | null = null;

function readVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    // Works both from ts-jest (src/config) and compiled output (dist/config).
    const pkg = JSON.parse(
      readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')
    ) as { version?: string };
    cachedVersion = pkg.version ?? '0.0.0';
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion;
}

export const versionInfo = {
  get version(): string {
    return process.env.SOURCE_VERSION || readVersion();
  },
  get commit(): string | undefined {
    const c = process.env.SOURCE_COMMIT;
    return c && c.trim() ? c.trim() : undefined;
  },
};

/** Process start time (ISO) — stable for the lifetime of the process. */
export const STARTED_AT = new Date().toISOString();

/** Process uptime in seconds. */
export function uptimeSeconds(): number {
  return Math.floor(process.uptime());
}
