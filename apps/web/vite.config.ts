import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    /**
     * PWA service worker (Phase 4).
     * - Precaches the built application shell only (js/css/html/icons):
     *   offline startup + navigation via navigateFallback.
     * - NO runtime caching of API requests and NEVER caches mutation
     *   POST/PUT/DELETE traffic — IndexedDB remains the durable offline
     *   store and the sync engine owns all data transfer.
     * - autoUpdate: new versions activate on next load (update detection +
     *   cache invalidation handled by Workbox precache manifest revisioning).
     * - Core synchronization does NOT depend on the service worker.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'manifest.json'],
      manifest: false, // keep the existing public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/(auth|sync|customers|orders|invoices|payments|materials|reports|settings|dashboard|admin|licenses|events|feature-requests|health)/,
        ],
        runtimeCaching: [],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow proxied preview hosts (e.g. Arena/e2b sandbox domains).
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@data': path.resolve(__dirname, 'src/data'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
});