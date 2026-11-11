import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs/config';
import { networkInterfaces } from 'node:os';

// React DevTools MCP(react-devtools-cdt-mcp): 개발 서버에서만 클라이언트 진입점 맨 앞에 넣음
// Next 개발 도구 화면이 자기 react-dom을 앱보다 먼저 hook에 연결해서, 그보다 먼저 붙어야 컴포넌트 도구가 동작함
// (instrumentation-client는 그 뒤에 실행돼 늦음, docs/agent/react-devtools-mcp.md)
const REACT_DEVTOOLS_MCP = 'react-devtools-cdt-mcp/register';
const withReactDevtoolsMcp = (entry) =>
  Array.isArray(entry)
    ? [REACT_DEVTOOLS_MCP, ...entry]
    : Array.isArray(entry?.import)
      ? { ...entry, import: [REACT_DEVTOOLS_MCP, ...entry.import] }
      : entry;

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
  // 폰에서 dev 서버를 열 때 /_next 개발 리소스 차단 방지: VS Code 포트 포워딩(dev tunnels), 개발 PC의 실제 LAN IPv4(앱 쉘·Expo Go)
  // `192.168.*.*` 같은 패턴은 `192.168.evil.com` 도메인과도 맞아서 실제 주소만 허용
  allowedDevOrigins: [
    '*.devtunnels.ms',
    '**.devtunnels.ms',
    ...Object.values(networkInterfaces())
      .flat()
      .flatMap((net) => (net && net.family === 'IPv4' && !net.internal ? [net.address] : [])),
  ],
  // 미설정이어도 빈 값으로 빌드 시점에 확정해 꺼진 빌드의 MSW 코드 제외(상수 조건 제거)
  env: {
    NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING ?? '',
    // 쿼리 캐시 저장본의 버전(배포마다 달라 이전 배포의 저장본을 버림). Vercel은 커밋, 그 밖은 서버를 켠 시각
    NEXT_PUBLIC_APP_BUILD: process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now()),
  },
  webpack: (config, { isServer, dev }) => {
    // msw/browser는 node 조건에서 export가 막혀 서버 번들은 빈 모듈로 대체(브라우저에서만 실행)
    if (isServer) config.resolve.alias = { ...config.resolve.alias, 'msw/browser': false };
    if (dev && !isServer) {
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        return { ...entries, 'main-app': withReactDevtoolsMcp(entries['main-app']) };
      };
    }
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
