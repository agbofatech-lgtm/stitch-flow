import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@data': path.resolve(__dirname, 'src/data'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/offline/setup.ts'],
    include: ['tests/offline/**/*.test.ts'],
    testTimeout: 20000,
    // IndexedDB state is per-file; run serially for determinism
    fileParallelism: false,
  },
});
