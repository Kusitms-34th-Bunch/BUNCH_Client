import { react } from '@app/lint-config';

export default [
  { ignores: ['dist/**', 'src/routeTree.gen.ts'] },
  ...react,
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/router.tsx'],
    rules: {
      'unused-imports/no-unused-vars': 'off',
    },
  },
];
