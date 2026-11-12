import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createLogger, defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'filter-pnp-warning',
      enforce: 'post',
      config(config) {
        const logger = config.customLogger ?? createLogger();
        const warnOnce = logger.warnOnce.bind(logger);
        logger.warnOnce = (message, options) => {
          if (message.includes('Using Yarn PnP with Vite is discouraged')) return;
          warnOnce(message, options);
        };
        return { customLogger: logger };
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./src/serverOnlyStub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    // 파일마다 프로세스 대신 worker thread(2026-11-13 로컬 web 전체: forks 49~58초 → threads 43~46초, 모두 통과)
    pool: 'threads',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // 여러 패키지 테스트를 동시에 돌리면(pre-push·verify) CPU가 모자라 기본 5초를 넘기는 화면 테스트가 있음
    testTimeout: 15_000,
    // PR CI는 바뀐 파일과 import로 이어진 테스트만 돌림(--changed). 테스트가 import하지 않는 것(setup·의존성·tsconfig)이 바뀌면 전체
    // 가짜 서버 handler는 `@/mocks/server`를 import한 테스트만 고름(응답에 기대는 테스트는 직접 import)
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      '**/vitest.setup.*',
      '**/tsconfig*.json',
      '**/yarn.lock',
      '**/.yarnrc.yml',
    ],
  },
});
