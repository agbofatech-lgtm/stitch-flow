import { Pool } from 'pg';
import { createShopService, type ShopService } from './service';
import { createMemoryShopRepository } from './memoryRepository';
import { createPostgresShopRepository } from './postgresRepository';
import { applyShopMigrations, defaultMigrationsDir } from './migrate';

export type ShopDatabaseMode = 'memory' | 'postgres';

export function resolveShopDatabaseMode(): ShopDatabaseMode {
  const raw = (process.env.SHOP_DATABASE_MODE || 'memory').toLowerCase();
  return raw === 'postgres' ? 'postgres' : 'memory';
}

export async function createConfiguredShopService(): Promise<{
  shop: ShopService;
  mode: ShopDatabaseMode;
  postgres: 'verified' | 'unavailable' | 'not-configured';
  migrations: 'verified' | 'pending' | 'failed' | 'not-applicable';
}> {
  const mode = resolveShopDatabaseMode();
  if (mode !== 'postgres') {
    return {
      shop: createShopService(createMemoryShopRepository()),
      mode: 'memory',
      postgres: 'not-configured',
      migrations: 'not-applicable',
    };
  }

  const url = process.env.SHOP_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('SHOP_DATABASE_MODE=postgres requires DATABASE_URL or SHOP_DATABASE_URL');
  }

  const pool = new Pool({ connectionString: url });
  try {
    await pool.query('select 1');
    await applyShopMigrations(pool, defaultMigrationsDir());
    return {
      shop: createShopService(createPostgresShopRepository(pool)),
      mode: 'postgres',
      postgres: 'verified',
      migrations: 'verified',
    };
  } catch (err) {
    await pool.end().catch(() => undefined);
    throw err;
  }
}
