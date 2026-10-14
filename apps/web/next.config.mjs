import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? 'bunch-01',
  project: process.env.SENTRY_PROJECT ?? 'javascript-nextjs',
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
});
