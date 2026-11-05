import { react } from '@app/lint-config';

export default [
  { ignores: ['dist/**', 'src/routeTree.gen.ts'] },
  ...react,
  {
    // web 구역은 apps/web 전용
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@app/design-system/web'],
              message: 'admin은 디자인 시스템의 web 구역을 import하지 않습니다.',
            },
          ],
        },
      ],
    },
  },
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
