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
  // CI는 앞 단계(tsc)에서 같은 타입 검사를 하므로 빌드 안의 검사를 건너뜀. 배포 빌드는 이 값이 없어 그대로 검사
  typescript: { ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === 'true' },
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
  // 앱 열기 도메인(open.bunch.kr): 초대 진입 페이지의 「초대장 확인하기」가 다른 도메인으로 넘겨 유니버셜 링크가 앱을 열게 함(같은 도메인 안 이동으로는 열리지 않음)
  // 앱이 있으면 iOS가 요청 전에 앱을 열고, 여기까지 오면 앱이 없는 것이라 화면 없이 곧바로 App Store로 보냄(흰 화면 없이 진입 페이지가 남은 채 이동)
  // 연결 파일(/.well-known/apple-app-site-association)은 리다이렉트하면 Apple이 받지 않아 /invite만 보냄. 값은 features/invite-entry/constants/messages.ts와 같음
  // 그 밖의 경로는 이 도메인에 화면(로그인 등)이 하나 더 생기지 않게 운영 주소로 보냄. 호스트 값은 정규식이라 점을 이스케이프
  redirects: async () => [
    {
      source: '/invite/:path*',
      has: [{ type: 'host', value: 'open\\.bunch\\.kr' }],
      destination: 'https://apps.apple.com/app/id6834488511',
      permanent: false,
    },
    {
      source: '/:path((?!\\.well-known/).*)',
      has: [{ type: 'host', value: 'open\\.bunch\\.kr' }],
      destination: 'https://app.bunch.kr/:path',
      permanent: false,
    },
  ],
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
