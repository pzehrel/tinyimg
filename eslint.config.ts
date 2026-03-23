import antfu from '@antfu/eslint-config'

export default antfu({
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
