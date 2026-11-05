import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs/config';

// ANALYZE=true 빌드에서만 모듈별 크기를 .next/analyze/client.json으로 기록(번들 크기 보고가 원인 표에 사용)
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'json',
  openAnalyzer: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // next dev가 AGENTS.md에 넣는 안내 블록 끄기(Yarn PnP라 블록이 가리키는 node_modules/next/dist/docs 경로가 없음)
  agentRules: false,
  // VS Code 포트 포워딩(dev tunnels)으로 폰에서 dev 서버를 열 때 /_next 개발 리소스 차단 방지
  allowedDevOrigins: ['*.devtunnels.ms', '**.devtunnels.ms'],
  // 미설정이어도 빈 값으로 빌드 시점에 확정해 꺼진 빌드의 MSW 코드 제외(상수 조건 제거)
  env: { NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING ?? '' },
  webpack: (config, { isServer }) => {
    // msw/browser는 node 조건에서 export가 막혀 서버 번들은 빈 모듈로 대체(브라우저에서만 실행)
    if (isServer) config.resolve.alias = { ...config.resolve.alias, 'msw/browser': false };
    return config;
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG ?? 'bunch-01',
  project: process.env.SENTRY_PROJECT ?? 'javascript-nextjs',
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
});
