import { defineConfig, devices } from '@playwright/test';

const adminBaseUrl = 'http://127.0.0.1:5173';
// 3000은 로컬 개발 서버가 쓰므로 비켜 둠
const webBaseUrl = 'http://127.0.0.1:3200';
// 배포된 주소를 주면 dev 서버 없이 그 주소에서 운영 스모크(e2e/production)만 실행
const productionBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // 재시도 1회: 불안정한 테스트를 숨기지 않으면서 한 번의 일시 실패는 넘김(2회는 실패 시간만 늘림)
  retries: process.env.CI ? 1 : 0,
  // 러너 4코어에서 dev 서버 2개와 함께 워커 2개(1개면 spec이 순서대로만 돎)
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: productionBaseUrl
    ? [
        {
          name: 'production-chromium',
          testMatch: /production\/.*\.spec\.ts/,
          use: { ...devices['Pixel 7'], baseURL: productionBaseUrl },
        },
      ]
    : [
        {
          name: 'admin-chromium',
          testMatch: /admin\/.*\.spec\.ts/,
          use: { ...devices['Desktop Chrome'], baseURL: adminBaseUrl },
        },
        {
          // 사용자 앱은 WebView 화면이라 모바일 크기로 확인
          name: 'web-chromium',
          testMatch: /web\/.*\.spec\.ts/,
          use: { ...devices['Pixel 7'], baseURL: webBaseUrl },
          // dev 서버가 화면을 처음 열 때 컴파일하므로 CI의 첫 이동이 느림
          timeout: 120_000,
          expect: { timeout: 30_000 },
        },
      ],
  webServer: productionBaseUrl
    ? []
    : [
        {
          command: 'yarn workspace @app/admin dev --host 127.0.0.1 --port 5173 --strictPort',
          url: adminBaseUrl,
          reuseExistingServer: !process.env.CI,
          stdout: process.env.CI ? 'pipe' : 'ignore',
          stderr: 'pipe',
          timeout: 120_000,
        },
        {
          // 실제 백엔드 없이 MSW 가짜 서버로 화면 흐름만 확인. dev 서버는 화면을 처음 열 때 컴파일하며 새로 불러와 메모리 상태(입력 초안)가 사라지고
          // 느려서(2026-11-16 로컬: dev 6분·불안정 3개, 운영 빌드 23초·22개 통과) 가짜 서버를 켠 운영 빌드로 띄움. Sentry 업로드는 끔
          command:
            'yarn workspace @app/web build && yarn workspace @app/web exec next start --hostname 127.0.0.1 --port 3200',
          url: webBaseUrl,
          env: {
            NEXT_PUBLIC_API_MOCKING: 'enabled',
            SENTRY_AUTH_TOKEN: '',
            NEXT_PUBLIC_SENTRY_DSN: '',
          },
          // 이미 떠 있는 서버는 MSW가 켜졌는지 알 수 없어 재사용하지 않음(포트가 쓰이고 있으면 오류)
          reuseExistingServer: false,
          stdout: process.env.CI ? 'pipe' : 'ignore',
          stderr: 'pipe',
          timeout: 300_000,
        },
      ],
});
