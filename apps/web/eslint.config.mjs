import { disableTypeChecked, next } from '@app/lint-config';
import { readdirSync } from 'node:fs';

// feature끼리 내부 파일 직접 import 금지(docs/architecture/domain-ownership.md). 공통 부분은 shared로 올림
// 기존 사용처는 예외로 두고 shared로 옮기며 줄임(새 예외 추가 금지)
const FEATURE_IMPORT_EXCEPTIONS = {
  bundle: ['photo-box'],
  'bunch-home': ['bundle'],
  'photo-box': ['bundle'],
};
// 서버(Route Handler·RSC) 전용 파일. 쿠키·토큰·백엔드 주소를 다뤄 브라우저 코드에서 import 금지(docs/architecture/api-boundary.md)
const SERVER_ONLY_API = {
  group: ['@/shared/api/server', '@/shared/api/server/*'],
  message: 'shared/api/server는 서버 전용입니다. 브라우저 코드는 bffApi로 BFF를 거칩니다.',
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
            SERVER_ONLY_API,
          ],
        },
      ],
    },
  };
});

const SHARED_NO_FEATURE = {
  group: ['@/features/*', '@/app/*'],
  message: 'shared는 feature·route를 import하지 않습니다. 필요한 값은 인자로 받습니다.',
};

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
  // node로 바로 실행하는 검사 스크립트(tsconfig 밖)
  { files: ['scripts/*.mjs'], ...disableTypeChecked },
  ...featureBoundaries,
  {
    // 운영 route는 샘플 데이터를 직접 쓰지 않음(가짜 링크·값이 운영에 나가지 않게). 테스트는 제외
    files: ['src/app/**/*.{ts,tsx}'],
    ignores: ['src/app/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/fixtures', '@/features/*/fixtures/*'],
              message:
                'route에서 fixture를 import하지 않습니다. 서버 응답을 받는 화면 컴포넌트를 씁니다.',
            },
          ],
        },
      ],
    },
  },
  // shared는 feature·route를 모름(docs/architecture/app-structure.md). 서버 전용 폴더는 서버 전용 파일끼리만 import
  // 같은 규칙은 뒤 블록이 덮어쓰므로, 서버 폴더 밖 블록은 두 제한을 함께 가짐
  ...[
    { files: ['src/shared/**/*.{ts,tsx}'], patterns: [SHARED_NO_FEATURE] },
    {
      files: ['src/shared/**/*.{ts,tsx}'],
      ignores: ['src/shared/api/server/**'],
      patterns: [SHARED_NO_FEATURE, SERVER_ONLY_API],
    },
  ].map(({ patterns, ...target }) => ({
    ...target,
    rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns }] },
  })),
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
    // 화면 id→서버 숫자 변환은 요청 층(api/)에서만(docs/architecture/data-layer.md "파일 배치 (web)")
    // 다른 import 제한 규칙을 덮어쓰지 않게 별도 규칙(no-restricted-syntax)으로 둠
    // ponytail: bundle은 동시 작업 중인 위반이 남아 제외, 그 작업이 머지되면 ignores에서 제거
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/api/**', 'src/**/*.test.{ts,tsx}', 'src/mocks/**', 'src/features/bundle/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportDeclaration[source.value=/shared\\/api\\/ids$/] ImportSpecifier[imported.name=/^(toWireId|requireWireId)$/]',
          message:
            '서버 숫자 ID 변환(toWireId)은 api/의 요청 함수 안에서만 합니다. 화면·hook·query는 문자열 id를 넘기고, 요청 여부 판단은 isWireId로 합니다.',
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
