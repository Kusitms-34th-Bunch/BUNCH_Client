import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => {
  const state = { optedIn: false };
  return {
    state,
    init: vi.fn(),
    has_opted_in_capturing: vi.fn(() => state.optedIn),
    opt_in_capturing: vi.fn(() => {
      state.optedIn = true;
    }),
    opt_out_capturing: vi.fn(() => {
      state.optedIn = false;
    }),
    reset: vi.fn(),
  };
});
vi.mock('posthog-js', () => ({ default: posthog }));

const load = () => import('./posthog');

beforeEach(() => {
  posthog.state.optedIn = false;
  window.localStorage.clear();
  [posthog.init, posthog.opt_in_capturing, posthog.opt_out_capturing, posthog.reset].forEach((fn) =>
    fn.mockClear(),
  );
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_API_MOCKING', '');
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('PostHog 제품 분석', () => {
  it('키가 없으면 SDK를 초기화하지 않고 동의도 무시한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    const { setAnalyticsConsent } = await load();

    await setAnalyticsConsent('1');

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
  });

  it.each([
    ['개발 빌드', 'development', ''],
    ['가짜 서버 빌드', 'production', 'enabled'],
  ])('%s는 키가 있어도 수집하지 않는다(운영 지표에 섞이지 않게)', async (_, nodeEnv, mocking) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', mocking);
    const { setAnalyticsConsent } = await load();

    await setAnalyticsConsent('1');

    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('동의하지 않았으면 SDK를 불러오지 않는다(이전 사용자의 저장된 동의로 먼저 수집되지 않게)', async () => {
    const { setAnalyticsConsent } = await load();

    await setAnalyticsConsent(null);

    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('동의 전 꺼짐·글자와 개인 속성 제외·녹화 끔으로 한 번만 초기화한다', async () => {
    const { setAnalyticsConsent } = await load();

    await Promise.all([setAnalyticsConsent('1'), setAnalyticsConsent('1')]);

    expect(posthog.init).toHaveBeenCalledOnce();
    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        defaults: '2026-08-30',
        opt_out_capturing_by_default: true,
        mask_all_text: true,
        capture_dead_clicks: true,
        autocapture: {
          element_attribute_ignorelist: expect.arrayContaining([
            'src',
            'alt',
            'href',
            'aria-label',
          ]) as string[],
        },
        disable_session_recording: true,
        capture_exceptions: false,
        disable_surveys: true,
        capture_performance: false,
      }),
    );
  });

  it('약관에 동의한 회원이면 켜고, 아니면 끄고 익명 ID를 새로 만든다', async () => {
    const { setAnalyticsConsent } = await load();

    await setAnalyticsConsent('1');
    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();

    // 이미 켜져 있으면 다시 부르지 않음
    await setAnalyticsConsent('1');
    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();

    posthog.reset.mockClear();
    await setAnalyticsConsent(null);
    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
    expect(posthog.reset).toHaveBeenCalledOnce();
  });

  it('로그아웃(문서 새로 열림) 뒤 다른 회원이 동의하면 이전 회원의 익명 ID를 이어 쓰지 않는다', async () => {
    // 회원 1이 동의한 기기: 동의는 SDK 저장소에 남아 있음
    await (await load()).setAnalyticsConsent('1');
    vi.resetModules();
    posthog.state.optedIn = true;
    posthog.reset.mockClear();
    posthog.opt_in_capturing.mockClear();

    const next = await load();
    await next.setAnalyticsConsent(null);
    // 새 문서에서 비로그인이면 SDK를 불러오지 않음
    expect(posthog.reset).not.toHaveBeenCalled();

    posthog.reset.mockImplementationOnce(() => {
      posthog.state.optedIn = false;
    });
    await next.setAnalyticsConsent('2');
    // 회원이 바뀌어 reset 뒤 opt_in(순서 중요)
    expect(posthog.reset).toHaveBeenCalledOnce();
    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();
    expect(posthog.reset.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.opt_in_capturing.mock.invocationCallOrder[0]!,
    );
  });

  it('같은 회원이 다시 열면 익명 ID를 유지한다', async () => {
    await (await load()).setAnalyticsConsent('1');
    vi.resetModules();
    posthog.reset.mockClear();

    await (await load()).setAnalyticsConsent('1');

    expect(posthog.reset).not.toHaveBeenCalled();
  });

  it('SDK를 받지 못했으면 다음 동의 때 다시 불러온다', async () => {
    const { setAnalyticsConsent } = await load();
    posthog.init.mockImplementationOnce(() => {
      throw new Error('chunk');
    });

    await expect(setAnalyticsConsent('1')).rejects.toThrow('chunk');
    await setAnalyticsConsent('1');

    expect(posthog.init).toHaveBeenCalledTimes(2);
    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();
  });

  it('보내기 전 주소·경로에서 query·hash를 지우고 숫자 ID를 감춘다(초대 코드, 회원 ID 등)', async () => {
    const { sanitizeAnalyticsEvent } = await load();

    const event = sanitizeAnalyticsEvent({
      uuid: '1',
      event: '$pageview',
      properties: {
        $current_url: 'https://bunch-web.vercel.app/members/42?code=SECRET#x',
        $referrer: 'https://example.com/a?token=abc',
        $pathname: '/bunch/drafts/7/photos/9',
        $elements_chain: 'a:href="/members/42?code=SECRET"nth-child="1"',
        $heatmap_data: {
          'https://bunch-web.vercel.app/members/42?code=A': [{ x: 1 }],
          'https://bunch-web.vercel.app/members/43#b': [{ x: 2 }],
        },
        count: 3,
        label: 'plain',
      },
      $set_once: { $initial_current_url: 'https://bunch-web.vercel.app/?code=SECRET' },
    });

    expect(event?.properties).toEqual({
      $current_url: 'https://bunch-web.vercel.app/members/:id',
      $referrer: 'https://example.com/a',
      $pathname: '/bunch/drafts/:id/photos/:id',
      $elements_chain: 'a:href="/members/:id"nth-child="1"',
      $heatmap_data: { 'https://bunch-web.vercel.app/members/:id': [{ x: 1 }, { x: 2 }] },
      count: 3,
      label: 'plain',
    });
    expect(event?.$set_once).toEqual({ $initial_current_url: 'https://bunch-web.vercel.app/' });
    expect(sanitizeAnalyticsEvent(null)).toBeNull();
  });

  it('초대 링크의 토큰(/invite/{토큰})도 주소·이전 주소·누른 링크에서 감춘다', async () => {
    const { sanitizeAnalyticsEvent } = await load();

    const event = sanitizeAnalyticsEvent({
      uuid: '1',
      event: '$pageview',
      properties: {
        $current_url: 'https://bunch-web.vercel.app/invite/Ab3_-xYz9QwErTy',
        $pathname: '/invite/Ab3_-xYz9QwErTy',
        $referrer: 'https://bunch-web.vercel.app/invite/Ab3_-xYz9QwErTy?from=kakao',
        $elements_chain: 'a:href="/invite/Ab3_-xYz9QwErTy"nth-child="1"',
      },
    });

    expect(event?.properties).toEqual({
      $current_url: 'https://bunch-web.vercel.app/invite/:token',
      $pathname: '/invite/:token',
      $referrer: 'https://bunch-web.vercel.app/invite/:token',
      $elements_chain: 'a:href="/invite/:token"nth-child="1"',
    });
  });
});
