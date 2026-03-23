import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  stylistic: true,
  ignores: [
    '**/dist',
    '**/node_modules',
    '**/.changeset',
    '**/fixtures',
    '**/.git',
    '**/coverage',
  ],
})
