/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';

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
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
