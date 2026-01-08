import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.property.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/compositions/', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@script': path.resolve(__dirname, './src/script'),
      '@tts': path.resolve(__dirname, './src/tts'),
      '@compositions': path.resolve(__dirname, './src/compositions'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pipeline': path.resolve(__dirname, './src/pipeline'),
    },
  },
});
