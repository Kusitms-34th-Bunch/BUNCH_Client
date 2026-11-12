import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createLogger, defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
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
  preview: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@api': fileURLToPath(new URL('./src/api', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // PR CI는 바뀐 파일과 관련된 테스트만 돌림(--changed). 테스트가 import하지 않는 것(setup·의존성·tsconfig)이 바뀌면 전체
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      '**/vitest.setup.*',
      '**/tsconfig*.json',
      '**/yarn.lock',
      '**/.yarnrc.yml',
    ],
  },
});
