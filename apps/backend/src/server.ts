import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { verifySchema } from './config/initDb';
import { versionInfo } from './config/version';
import { registerGracefulShutdown } from './config/shutdown';

/**
 * Process bootstrap: verifies the database schema is migrated, then starts
 * the canonical Express application (see app.ts) with graceful shutdown.
 *
 * Run migrations first: `npm run migrate` (scripts/run-migrations.js).
 */
async function main() {
  try {
    await verifySchema();
  } catch (err) {
    logger.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(
      {
        version: versionInfo.version,
        commit: versionInfo.commit,
        port: env.PORT,
        env: env.NODE_ENV,
      },
      `StitchFlow backend listening on http://0.0.0.0:${env.PORT}`
    );
  });

  registerGracefulShutdown(server);
}

void main();
