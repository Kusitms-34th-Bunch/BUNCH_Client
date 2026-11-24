// @ts-check
// 모든 응답에 붙이는 보안 헤더(next.config.mjs headers, #558). 빌드 시점의 공개 환경 변수로 출처를 정함
// CSP는 출처를 다 확인하기 전이라 Report-Only로 위반만 Sentry에 보고, 출처와 무관한 항목만 강제

/** @param {string | undefined} raw */
const originOf = (raw) => {
  try {
    return raw ? new URL(raw).origin : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Sentry DSN(`https://<key>@<host>/<projectId>`)에서 CSP 위반 보고 주소 계산
 * @param {string} dsn
 * @param {string} [environment]
 */
export const sentryCspReportUri = (dsn, environment) => {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, '');
    if (!url.username || !projectId) return undefined;
    const query = new URLSearchParams({ sentry_key: url.username });
    if (environment) query.set('sentry_environment', environment);
    return `${url.origin}/api/${projectId}/security/?${query}`;
  } catch {
    return undefined;
  }
};

// PostHog 기본 호스트(posthog.ts api_host와 같은 값)는 확장 스크립트(클릭 히트맵 등)를 assets 호스트에서 받음
/** @param {string | undefined} host */
const posthogOrigins = (host) => {
  const origin = originOf(host || 'https://us.i.posthog.com');
  if (!origin) return [];
  const assets = origin.replace(
    /^https:\/\/(us|eu)\.i\.posthog\.com$/,
    'https://$1-assets.i.posthog.com',
  );
  return assets === origin ? [origin] : [origin, assets];
};

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ report?: boolean }} [options] 보고 주소를 붙일지(기본 붙임)
 */
export const buildCspReportOnly = (env, { report = true } = {}) => {
  const posthog = posthogOrigins(env.NEXT_PUBLIC_POSTHOG_HOST);
  const sentry = originOf(env.NEXT_PUBLIC_SENTRY_DSN);
  const ws = originOf(env.NEXT_PUBLIC_WS_URL);
  const reportUri =
    env.NEXT_PUBLIC_SENTRY_DSN &&
    sentryCspReportUri(
      env.NEXT_PUBLIC_SENTRY_DSN,
      env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    );
  // Next 인라인 스크립트(하이드레이션 데이터)는 nonce 없이 'unsafe-inline'. nonce는 모든 페이지가 동적 렌더가 돼 보류
  const scriptSrc = ["'self'", "'unsafe-inline'", ...posthog];
  if (env.NODE_ENV === 'development') scriptSrc.push("'unsafe-eval'");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    // 모션·라이브러리가 style 속성을 직접 씀
    "style-src 'self' 'unsafe-inline'",
    // 서버 사진 주소의 도메인이 정해지지 않아 https 전체(목 사진·업로드 미리보기는 self·blob)
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "media-src 'self'",
    `connect-src ${["'self'", ws, sentry, ...posthog].filter(Boolean).join(' ')}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (report && reportUri) directives.push(`report-uri ${reportUri}`);
  return directives.join('; ');
};

/** @param {Record<string, string | undefined>} env */
export const securityHeaders = (env) => [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 쓰지 않는 기기 권한 차단(사진 선택·저장은 쉘의 네이티브 기능)
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // 출처와 무관해 바로 강제: 다른 사이트의 iframe 삽입, 플러그인, base 태그 바꿔치기 차단(frame-ancestors는 Report-Only에서 무시됨)
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  },
  { key: 'Content-Security-Policy-Report-Only', value: buildCspReportOnly(env) },
];

// 초대 페이지는 보고서의 document-uri에 초대 토큰이 실려 보고 주소 없이 덮어씀(같은 key는 뒤 항목이 적용)
/** @param {Record<string, string | undefined>} env */
export const inviteSecurityHeaders = (env) => [
  { key: 'Content-Security-Policy-Report-Only', value: buildCspReportOnly(env, { report: false }) },
];
