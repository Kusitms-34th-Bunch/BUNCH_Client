import { base, disableTypeChecked } from '@app/lint-config';
export default [
  {
    // .agents/notes·.agents/state: git에 올리지 않는 개인 메모·로컬 작업 파일(.gitignore)
    ignores: [
      'apps/**',
      'packages/**',
      '.yarn/**',
      '.pnp.*',
      '.worktrees/**',
      '.agents/notes/**',
      '.agents/state/**',
    ],
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
