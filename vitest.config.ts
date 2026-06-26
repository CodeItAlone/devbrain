import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/tests/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    alias: {
      '@devbrain/shared': resolve(__dirname, './packages/shared/src/index.ts'),
      '@devbrain/core': resolve(__dirname, './packages/core/src/index.ts')
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90
      }
    }
  }
});
