import { disableTypeChecked, react } from '@app/lint-config';

export default [
  { ignores: ['storybook-static/**'] },
  ...react,
  { files: ['scripts/*.mjs'], ...disableTypeChecked },
  {
    // core는 모든 앱이 쓰므로 web(apps/web 전용)·admin(apps/admin 전용) 구역 import 금지
    files: ['src/components/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/web', '**/web/*', '@app/design-system/web'],
              message: 'core 컴포넌트는 web 구역을 import하지 않습니다.',
            },
            {
              group: ['**/admin', '**/admin/*', '@app/design-system/admin'],
              message: 'core 컴포넌트는 admin 구역을 import하지 않습니다.',
            },
          ],
        },
      ],
    },
  },
  {
    // web 구역과 admin 구역은 서로 다른 앱 전용이라 서로 import 금지(둘 다 core는 씀)
    files: ['src/components/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/admin', '**/admin/*', '@app/design-system/admin'],
              message: 'web 컴포넌트는 admin 구역을 import하지 않습니다.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/admin/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/web', '**/web/*', '@app/design-system/web'],
              message: 'admin 컴포넌트는 web 구역을 import하지 않습니다.',
            },
          ],
        },
      ],
    },
  },
];
