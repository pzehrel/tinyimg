import antfu from '@antfu/eslint-config'

const base = await antfu({
  typescript: true,
  markdown: false,
  formatters: {
    markdown: true,
  },
  ignores: [
    '**/dist',
    '**/node_modules',
    '**/.changeset',
    '**/fixtures',
    '**/.git',
    '**/coverage',
  ],
  rules: {
    'no-console': 'off',
  },
})

export default [
  ...base,
  // 对 core 包启用 no-console
  {
    files: ['packages/tinyimg-core/src/**/*.ts'],
    rules: {
      'no-console': 'error',
    },
  },
]
