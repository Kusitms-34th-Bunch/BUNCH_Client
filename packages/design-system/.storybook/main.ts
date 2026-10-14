import type { StorybookConfig } from '@storybook/react-vite';
import { createLogger } from 'vite';

const logger = createLogger();
const warnOnce = logger.warnOnce.bind(logger);
logger.warnOnce = (message, options) => {
  if (message.includes('Using Yarn PnP with Vite is discouraged')) return;
  warnOnce(message, options);
};

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  framework: '@storybook/react-vite',
  viteFinal: (config) => ({ ...config, customLogger: logger }),
};

export default config;
