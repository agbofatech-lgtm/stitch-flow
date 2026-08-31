import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        experience: path.resolve(__dirname, 'experience-preview.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@data': path.resolve(__dirname, 'src/data'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@experience': path.resolve(__dirname, 'src/experience'),
    },
  },
});