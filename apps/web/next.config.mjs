import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // next dev가 AGENTS.md에 넣는 안내 블록 끄기(Yarn PnP라 블록이 가리키는 node_modules/next/dist/docs 경로가 없음)
  agentRules: false,
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
