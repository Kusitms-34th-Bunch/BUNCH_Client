import { describe, expect, it } from 'vitest';
import {
  buildCspReportOnly,
  inviteSecurityHeaders,
  securityHeaders,
  sentryCspReportUri,
} from './securityHeaders.mjs';

const DSN = 'https://abc123@o1.ingest.us.sentry.io/4500';

describe('sentryCspReportUri', () => {
  it('DSN에서 보고 주소를 계산한다', () => {
    expect(sentryCspReportUri(DSN, 'production')).toBe(
      'https://o1.ingest.us.sentry.io/api/4500/security/?sentry_key=abc123&sentry_environment=production',
    );
  });

  it('형식이 틀린 DSN이면 주소를 만들지 않는다', () => {
    expect(sentryCspReportUri('not-a-url')).toBeUndefined();
    expect(sentryCspReportUri('https://o1.ingest.us.sentry.io/4500')).toBeUndefined();
  });
});

describe('buildCspReportOnly', () => {
  it('WS·Sentry·PostHog 출처를 connect-src에 넣고 보고 주소를 붙인다', () => {
    const csp = buildCspReportOnly({
      NEXT_PUBLIC_SENTRY_DSN: DSN,
      NEXT_PUBLIC_WS_URL: 'wss://api.bunch.example/ws',
    });
    expect(csp).toContain(
      "connect-src 'self' wss://api.bunch.example https://o1.ingest.us.sentry.io https://us.i.posthog.com https://us-assets.i.posthog.com",
    );
    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://us.i.posthog.com");
    expect(csp).toContain('report-uri https://o1.ingest.us.sentry.io/api/4500/security/');
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('TestFlight 테스터용 개발 WS 출처도 connect-src에 넣는다(#581)', () => {
    const csp = buildCspReportOnly({
      NEXT_PUBLIC_WS_URL: 'wss://api.bunch.example/ws',
      NEXT_PUBLIC_WS_URL_STAGING: 'wss://dev.bunch.example/ws',
    });
    expect(csp).toContain("connect-src 'self' wss://api.bunch.example wss://dev.bunch.example ");
  });

  it('환경 변수가 없으면 같은 출처와 PostHog 기본 호스트만 허용하고 보고 주소를 빼며, 개발에서만 eval을 허용한다', () => {
    const csp = buildCspReportOnly({ NODE_ENV: 'development' });
    expect(csp).toContain(
      "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com",
    );
    expect(csp).not.toContain('report-uri');
    expect(csp).toContain("'unsafe-eval'");
  });
});

it('iframe 삽입 차단은 Report-Only가 아니라 강제 CSP에 둔다', () => {
  const headers = securityHeaders({});
  const enforced = headers.find((h) => h.key === 'Content-Security-Policy')?.value;
  expect(enforced).toBe("frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
  expect(headers.map((h) => h.key)).toContain('X-Content-Type-Options');
});

it('초대 페이지 CSP는 토큰이 든 주소가 보고되지 않게 보고 주소를 뺀다', () => {
  const [header] = inviteSecurityHeaders({ NEXT_PUBLIC_SENTRY_DSN: DSN });
  expect(header?.key).toBe('Content-Security-Policy-Report-Only');
  expect(header?.value).not.toContain('report-uri');
  expect(header?.value).toContain("default-src 'self'");
});
