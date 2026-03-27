import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['./packages/tinyimg-cli', './packages/tinyimg-core', './packages/tinyimg-unplugin'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.config.ts',
      '**/.claude/worktrees/**',
    ],
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
