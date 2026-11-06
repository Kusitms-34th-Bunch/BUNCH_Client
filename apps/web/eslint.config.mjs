import { next } from '@app/lint-config';
import { readdirSync } from 'node:fs';

// feature끼리 내부 파일 직접 import 금지(docs/architecture/domain-ownership.md). 공통 부분은 shared로 올림
// 기존 사용처는 예외로 두고 shared로 옮기며 줄임(새 예외 추가 금지)
const FEATURE_IMPORT_EXCEPTIONS = {
  bundle: ['photo-box'],
  'bunch-home': ['bundle'],
  'photo-box': ['bundle'],
};
const FEATURES = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const featureBoundaries = FEATURES.map((feature) => {
  const allowed = [feature, ...(FEATURE_IMPORT_EXCEPTIONS[feature] ?? [])];
  return {
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/features/*',
                ...allowed.flatMap((name) => [`!@/features/${name}`, `!@/features/${name}/**`]),
              ],
              message:
                '다른 feature의 내부 파일은 import하지 않습니다. 공통 부분은 shared로 옮기거나 route에서 조합합니다.',
            },
          ],
        },
      ],
    },
  };
});

// API 연동 파일 경계(docs/architecture/data-layer.md "파일 배치 (web)")
const QUERY_DEFINITION_FILES = [
  'src/features/**/queries/**',
  'src/shared/query/**',
  'src/shared/providers/QueryProvider.tsx',
];
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
  // mockServiceWorker.js는 msw init 생성 파일
  { ignores: ['.next/**', 'public/mockServiceWorker.js'] },
  ...featureBoundaries,
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
