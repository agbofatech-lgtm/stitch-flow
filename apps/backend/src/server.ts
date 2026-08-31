import { createApp } from './app';

const PORT = Number(process.env.PORT || 5000);
const mountBusinessRoutes = process.env.MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES === 'true';

createApp({ mountBusinessRoutes })
  .then((app) => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `StitchFlow authoritative runtime listening on http://0.0.0.0:${PORT}`
      );
      console.log(`entrypoint=apps/backend/src/server.ts application=apps/backend/src/app.ts`);
      console.log(`businessRoutesMounted=${mountBusinessRoutes}`);
    });

    server.on('error', (err) => {
      console.error('Failed to bind authoritative runtime:', err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('Failed to create authoritative application:', err);
    process.exit(1);
  });
