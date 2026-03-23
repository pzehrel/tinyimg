import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    plugins: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.config.ts',
      ],
    },
  },
  resolve: {
    // Ensure test files can be resolved from packages
  },
})
