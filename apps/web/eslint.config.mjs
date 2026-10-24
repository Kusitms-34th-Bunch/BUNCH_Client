import { next } from '@app/lint-config';

// API 연동 파일 경계(docs/architecture/data-layer.md "파일 배치 (web)")
const QUERY_DEFINITION_FILES = ['src/features/**/queries/**', 'src/shared/query/**'];
const TANSTACK_DEFINITIONS = [
  'QueryClient',
  'QueryClientProvider',
  'infiniteQueryOptions',
  'mutationOptions',
  'queryOptions',
  'useMutation',
  'useQueryClient',
];

export default [
  ...next,
  { ignores: ['.next/**'] },
  {
    // 화면은 options를 받아 읽기만 하고, 정의·캐시 조작은 queries/에서만
    files: ['src/**/*.{ts,tsx}'],
    ignores: QUERY_DEFINITION_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/react-query',
              importNames: TANSTACK_DEFINITIONS,
              allowTypeImports: true,
              message:
                'query 정의(queryOptions)·mutation·캐시 조작은 feature의 queries/(공용은 shared/query/)에 둡니다.',
            },
          ],
        },
      ],
    },
  },
  {
    // 요청 함수는 HTTP 요청과 계약 변환만 담당
    files: ['src/features/**/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'api/의 요청 함수는 React에 의존하지 않습니다.' },
            {
              name: '@tanstack/react-query',
              message: 'api/의 요청 함수는 TanStack Query에 의존하지 않습니다(queries/에 둡니다).',
            },
            { name: 'next/navigation', message: 'api/의 요청 함수는 route에 의존하지 않습니다.' },
            {
              name: '@app/design-system',
              message: 'api/의 요청 함수는 UI(toast 등)에 의존하지 않습니다.',
            },
          ],
        },
      ],
    },
  },
];
