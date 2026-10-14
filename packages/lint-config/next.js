import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';
import { react } from './react.js';

export const next = tseslint.config(...react, {
  plugins: {
    '@next/next': nextPlugin,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs['core-web-vitals'].rules,
    'react-refresh/only-export-components': [
      'warn',
      {
        allowConstantExport: true,
        allowExportNames: [
          'metadata',
          'generateMetadata',
          'viewport',
          'generateViewport',
          'generateStaticParams',
        ],
      },
    ],
  },
});
