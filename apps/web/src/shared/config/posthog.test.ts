import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  get_property: vi.fn(),
  reset: vi.fn(),
  register: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: posthog }));

const load = async () => (await import('./posthog')).initAnalytics();
const startNew = async () => (await import('./posthog')).startNewAnalyticsUser();

beforeEach(() => {
  Object.values(posthog).forEach((fn) => fn.mockReset());
  vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'enabled');
  window.history.replaceState(null, '', '/bunch');
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
    expect(posthog.register).not.toHaveBeenCalled();
  });

  it('주소의 참가자 번호가 바뀌면 새 익명 사용자로 시작해 번호를 붙인다', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    window.history.replaceState(null, '', '/bunch?ut=P2');
    posthog.get_property.mockReturnValue('P1');

    await load();

    expect(posthog.register).toHaveBeenCalledWith({ ut_participant: 'P2' });
    // reset이 저장된 속성을 비우므로 번호는 reset 뒤에 붙어야 함
    expect(posthog.reset.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.register.mock.invocationCallOrder[0]!,
    );
  });

  it('같은 참가자 번호로 다시 들어오면 기록을 이어 간다', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    window.history.replaceState(null, '', '/bunch?ut=P2');
    posthog.get_property.mockReturnValue('P2');

    await load();

    expect(posthog.reset).not.toHaveBeenCalled();
    expect(posthog.register).not.toHaveBeenCalled();
  });

  it('형식에 맞지 않는 참가자 번호는 무시한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    window.history.replaceState(null, '', '/bunch?ut=%3Cscript%3E');

    await load();

    expect(posthog.register).not.toHaveBeenCalled();
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
