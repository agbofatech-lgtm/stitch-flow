import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createPlatformRuntime, type PlatformRuntime } from './platform/runtime';
import { loadOrCreateStore } from './platform/persist';
import { authRoutes } from './routes/authRoutes';
import { platformRoutes } from './routes/platformRoutes';
import { commercialRoutes } from './routes/commercialRoutes';
import { controlRoutes } from './routes/controlRoutes';
import { shopRoutes } from './routes/shopRoutes';
import { createShopService, type ShopService } from './shop/service';
import { createConfiguredShopService } from './shop/runtime';

export type CreateAppOptions = {
  /**
   * When true, mounts unauthenticated business CRUD from existing routers.
   * Default false — T1 must not expose previously unmounted CRUD (STOP D / T0 R4).
   */
  mountBusinessRoutes?: boolean;
  platform?: PlatformRuntime;
  shop?: ShopService;
};

export async function createApp(options: CreateAppOptions = {}): Promise<Express> {
  const mountBusinessRoutes = options.mountBusinessRoutes === true;
  const app = express();
  const loaded = loadOrCreateStore(process.env.PLATFORM_DATA_PATH);
  const platform = options.platform ?? createPlatformRuntime(loaded.store, { persist: loaded.persist });
  app.locals.platform = platform;
  const shopRuntime = options.shop
    ? { shop: options.shop, mode: 'memory' as const, postgres: 'not-configured' as const, migrations: 'not-applicable' as const }
    : await createConfiguredShopService();
  app.locals.shop = shopRuntime.shop;
  app.locals.persistenceDriver = options.platform ? 'injected' : loaded.driver;
  app.locals.shopPersistence = shopRuntime.mode;
  app.locals.shopPostgres = shopRuntime.postgres;
  app.locals.shopMigrations = shopRuntime.migrations;

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(
    helmet({
      // API is called from the Vite origin (:5173). Default helmet CORP same-origin
      // would block the browser even when CORS allows it.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE || '10mb' }));

  app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      console.log(
        '[API]',
        req.method,
        req.originalUrl,
        '->',
        res.statusCode,
        '(' + (Date.now() - startedAt) + 'ms)',
        'origin=' + (req.headers.origin || '-'),
        'ua=' + (req.headers['user-agent'] || '-')
      );
    });

    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      message: 'StitchFlow backend is running',
      runtime: 'apps/backend/src/app.ts',
      businessRoutesMounted: mountBusinessRoutes,
    });
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      runtime: 'apps/backend/src/app.ts',
      businessRoutesMounted: mountBusinessRoutes,
    });
  });

  app.get('/ready', (_req, res) => {
    const shopPostgres = app.locals.shopPostgres || 'not-configured';
    const shopMigrations = app.locals.shopMigrations || 'not-applicable';
    const shopMode = app.locals.shopPersistence || 'memory';
    const ready = shopMode !== 'postgres' || shopPostgres === 'verified';
    res.status(ready ? 200 : 503).json({
      ready,
      runtime: 'apps/backend/src/app.ts',
      businessRoutesMounted: mountBusinessRoutes,
      database: {
        mode: shopMode,
        postgres: shopPostgres,
        migrations: shopMigrations,
      },
      platformIam: 'durable-file-or-memory',
      persistence: process.env.PLATFORM_DATA_PATH ? 'file' : 'memory',
      postgres: shopPostgres,
      shopApi: shopMode === 'postgres' ? 'authenticated-postgres' : 'authenticated-memory',
      controlCenter: true,
      billingProvider: 'deferred',
    });
  });

  app.use('/auth', authRoutes);
  app.use('/platform', platformRoutes);
  app.use('/platform', commercialRoutes);
  app.use('/control', controlRoutes);
  app.use('/shop', shopRoutes);

  if (mountBusinessRoutes) {
    const { dashboardRoutes } = await import('./routes/dashboardRoutes');
    const { customerRoutes } = await import('./routes/customerRoutes');
    const { orderRoutes } = await import('./routes/orderRoutes');
    const { invoiceRoutes } = await import('./routes/invoiceRoutes');
    const { paymentRoutes } = await import('./routes/paymentRoutes');
    const { materialRoutes } = await import('./routes/materialRoutes');
    const { reportRoutes } = await import('./routes/reportRoutes');
    const { settingsRoutes } = await import('./routes/settingsRoutes');

    app.use('/dashboard', dashboardRoutes);
    app.use('/customers', customerRoutes);
    app.use('/orders', orderRoutes);
    app.use('/invoices', invoiceRoutes);
    app.use('/payments', paymentRoutes);
    app.use('/materials', materialRoutes);
    app.use('/reports', reportRoutes);
    app.use('/settings', settingsRoutes);
  }

  return app;
}
