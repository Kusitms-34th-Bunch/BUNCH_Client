import { createLogger, defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [
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
  test: {
    environment: 'node',
    globals: true,
    // PR CI는 바뀐 파일과 관련된 테스트만 돌림(--changed). 의존성이 바뀌면 전체
    forceRerunTriggers: [...configDefaults.forceRerunTriggers, '**/yarn.lock', '**/.yarnrc.yml'],
  },
});
