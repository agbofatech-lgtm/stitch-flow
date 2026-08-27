import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { verifySchema } from './config/initDb';

/**
 * Process bootstrap: verifies the database schema is migrated, then starts
 * the canonical Express application (see app.ts).
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

  app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`StitchFlow backend listening on http://0.0.0.0:${env.PORT}`);
  });
}

void main();
