import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stitchflow.app',
  appName: 'StitchFlow',
  webDir: '../web/dist',
  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
