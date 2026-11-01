import { base, disableTypeChecked } from '@app/lint-config';
export default [
  {
    // .agents/notes: git에 올리지 않는 개인 메모(.gitignore)
    ignores: ['apps/**', 'packages/**', '.yarn/**', '.pnp.*', '.worktrees/**', '.agents/notes/**'],
  },
  ...base,
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...disableTypeChecked,
  },
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
