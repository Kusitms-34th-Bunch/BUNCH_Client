import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: posthog }));

const load = async () => (await import('./posthog')).initAnalytics();
const startNew = async () => (await import('./posthog')).startNewAnalyticsUser();

beforeEach(() => {
  Object.values(posthog).forEach((fn) => fn.mockReset());
  vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'enabled');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('PostHog 클릭 흐름 수집', () => {
  it('키가 없으면 SDK를 초기화하지 않는다', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');

    await load();

    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('가짜 서버 빌드가 아니면 키가 있어도 수집하지 않는다(운영 키 사고 방지)', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', '');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');

    await load();
    await startNew();

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.reset).not.toHaveBeenCalled();
  });

  it('키가 있으면 녹화를 끄고 클릭 자동 수집 기본값으로 초기화한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');

    await load();

    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        defaults: '2026-08-30',
        disable_session_recording: true,
        capture_dead_clicks: true,
        capture_exceptions: false,
        disable_surveys: true,
        capture_performance: false,
      }),
    );
  });

  it('회차를 새로 시작하면 새 익명 사용자로 바꾼다', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');

    await startNew();

    expect(posthog.reset).toHaveBeenCalled();
  });

  it('키가 없으면 회차 시작 때 아무것도 하지 않는다', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');

    await startNew();

    expect(posthog.reset).not.toHaveBeenCalled();
  });
});
