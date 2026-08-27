import type { CapacitorConfig } from '@capacitor/cli';

/**
 * StitchFlow Android app configuration (Phase 6 hardened).
 *
 * - androidScheme 'https': the WebView serves the bundled app over a
 *   secure origin (no cleartext scheme).
 * - No cleartext flag: production builds must never fetch over HTTP.
 * - Backend base URL is supplied at runtime by the web app's
 *   VITE_API_BASE_URL build input (HTTPS in production).
 */
const config: CapacitorConfig = {
  appId: 'com.stitchflow.app',
  appName: 'StitchFlow',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
