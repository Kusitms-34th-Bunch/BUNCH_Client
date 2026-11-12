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
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // PR CI는 바뀐 파일과 관련된 테스트만 돌림(--changed). 테스트가 import하지 않는 것(setup·가짜 서버·의존성·tsconfig)이 바뀌면 전체
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      '**/vitest.setup.*',
      '**/src/mocks/**',
      '**/tsconfig*.json',
      '**/yarn.lock',
      '**/.yarnrc.yml',
    ],
  },
});
