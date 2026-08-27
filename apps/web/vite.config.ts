import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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