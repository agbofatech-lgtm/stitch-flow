import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Root Capacitor reference config — aligned with the authoritative app
 * platform under apps/mobile (Phase 6). The previous stale entry
 * ("Tailor Studio" / com.tailorstudio.app / HTTP scheme) was never the
 * shipping configuration and has been corrected so no tooling run from
 * the repository root can accidentally build with the wrong identity.
 *
 * The shipping Android platform lives in apps/mobile/android
 * (applicationId com.stitchflow.app, versionName 1.0.0).
 */
const config: CapacitorConfig = {
  appId: 'com.stitchflow.app',
  appName: 'StitchFlow',
  webDir: 'apps/web/dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
