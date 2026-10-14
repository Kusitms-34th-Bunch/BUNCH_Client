import { base, disableTypeChecked } from '@app/lint-config';
export default [
  {
    ignores: ['apps/**', 'packages/**', '.yarn/**', '.pnp.*'],
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
