import { disableTypeChecked, react } from '@app/lint-config';

export default [
  { ignores: ['storybook-static/**'] },
  ...react,
  { files: ['scripts/*.mjs'], ...disableTypeChecked },
  {
    // core는 모든 앱이 쓰므로 web(apps/web 전용) 구역을 가져오지 않는다
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
          ],
        },
      ],
    },
  },
];
