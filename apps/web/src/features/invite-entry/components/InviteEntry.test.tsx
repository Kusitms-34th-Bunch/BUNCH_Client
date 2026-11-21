import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { clearPendingInvitation, readPendingInvitation } from '@/shared/lib/pendingInvitation';
import { createQueryWrapper } from '@/shared/query/testing';
import type * as ExternalLink from '../lib/externalLink';
import { APP_STORE_URL } from '../constants/messages';
import { InviteEntry } from './InviteEntry';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
// 클립보드 복사와 페이지 밖 이동(앱 열기 도메인, 카카오톡 외부 열기)은 기록만 함
const copyText = vi.fn<(_text: string) => Promise<boolean>>(() => Promise.resolve(true));
vi.mock('@/shared/lib/clipboard', () => ({ copyText: (text: string) => copyText(text) }));
const open = vi.fn<(_url: string) => void>();
vi.mock('../lib/externalLink', async (importOriginal) => ({
  ...(await importOriginal<typeof ExternalLink>()),
  openExternalUrl: (url: string) => open(url),
}));
type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const Query = createQueryWrapper();
const Providers = ({ children }: { children: ReactNode }) => <Query>{children}</Query>;
const CONTINUE = '/onboarding/join/enter';
const renderEntry = (props: Partial<Parameters<typeof InviteEntry>[0]> = {}) =>
  render(<InviteEntry token="ABCD2345" continueHref={CONTINUE} {...props} />, {
    wrapper: Providers,
  });
const checkButton = () => screen.getByRole('button', { name: '초대장 확인하기' });
// 「앱 설치하기」는 기기에 따라 링크(iPhone·iPad)와 버튼(그 밖)으로 그려서 기본은 iPhone으로 둠
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
const KAKAOTALK_IPHONE_UA = `${IPHONE_UA} KAKAOTALK 10.8.0`;
const KAKAOTALK_REOPEN = `kakaotalk://web/openExternal?url=${encodeURIComponent(
  'http://localhost:3000/invite/ABCD2345',
)}`;
const mockDevice = (userAgent: string, touchPoints: number) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(touchPoints);
};
describe('InviteEntry', () => {
  beforeEach(() => {
    push.mockClear();
    open.mockClear();
    copyText.mockClear();
    toast.mockClear();
    clearPendingInvitation();
    mockDevice(IPHONE_UA, 5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('로고(제목)와 소개 문구, 두 버튼을 보여 준다', () => {
    renderEntry();

    expect(screen.getByRole('heading', { level: 1, name: 'Bunch' })).toBeTruthy();
    expect(screen.getByText('함께한 순간이 모이는 곳')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('link', { name: '앱 설치하기' })).toBeTruthy();
    expect(checkButton()).toBeTruthy();
  });

  it('버튼 색은 Figma대로 앱 설치하기는 회색(secondary), 초대장 확인하기는 브랜드색이다', () => {
    renderEntry();

    expect(screen.getByRole('link', { name: '앱 설치하기' }).className).toContain(
      'bg-surface-tertiary',
    );
    expect(checkButton().className).toContain('bg-surface-brand');
    expect(checkButton().className).not.toContain('bg-surface-inversed');
  });

  it('토스트는 두 버튼이 있는 하단 영역 위에 뜨도록 앵커를 가진다(로그인 화면과 같은 방식)', () => {
    renderEntry();

    const anchor = document.querySelector('[data-toast-anchor="wrapper"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.contains(checkButton())).toBe(true);
    expect(anchor?.contains(screen.getByRole('link', { name: '앱 설치하기' }))).toBe(true);
  });

  it('앱 설치하기는 App Store 앱 페이지로 가는 같은 탭 링크다', () => {
    renderEntry();

    const install = screen.getByRole('link', { name: '앱 설치하기' });
    expect(install.getAttribute('href')).toBe(APP_STORE_URL);
    expect(install.getAttribute('target')).toBeNull();
    expect(APP_STORE_URL).toBe('https://apps.apple.com/app/id6834488511');
  });

  it.each([
    ['iPhone', IPHONE_UA, 0],
    ['iPadOS(Mac처럼 알림)', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5],
  ])('%s에서 앱 설치하기는 App Store 링크다', (_name, userAgent, touchPoints) => {
    mockDevice(userAgent, touchPoints);
    renderEntry();

    expect(screen.getByRole('link', { name: '앱 설치하기' }).getAttribute('href')).toBe(
      APP_STORE_URL,
    );
    expect(screen.queryByRole('button', { name: '앱 설치하기' })).toBeNull();
  });

  it.each([
    ['Android', 'Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5],
    ['Mac PC', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0],
    ['Windows PC', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0],
  ])(
    '%s에서 앱 설치하기는 링크가 아닌 버튼이고, 누르면 iOS 앱만 있다고 알린다',
    async (_name, userAgent, touchPoints) => {
      mockDevice(userAgent, touchPoints);
      renderEntry();

      expect(screen.queryByRole('link', { name: '앱 설치하기' })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: '앱 설치하기' }));

      expect(toast).toHaveBeenCalledWith('지금은 iOS 앱만 지원해요.');
    },
  );

  describe('앱 밖(브라우저)의 초대장 확인하기', () => {
    it('iPhone은 서버에 묻지 않고 초대 링크를 복사한 뒤 앱 열기 도메인으로 넘긴다(앱이 있으면 앱, 없으면 App Store)', async () => {
      let called = false;
      server.use(
        http.get('/api/invitations/:token', () => {
          called = true;
          return ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' });
        }),
      );
      renderEntry();

      await userEvent.click(checkButton());

      expect(copyText).toHaveBeenCalledWith('https://app.bunch.kr/invite/ABCD2345');
      expect(open).toHaveBeenCalledWith('https://open.bunch.kr/invite/ABCD2345');
      // 곧바로 넘어가 보이지 않으므로 복사 안내는 띄우지 않음
      await Promise.resolve();
      expect(toast).not.toHaveBeenCalled();
      // iOS는 누른 그 순간의 이동만 앱을 열어 서버 조회를 기다리지 않음(유효성은 앱이 확인)
      expect(called).toBe(false);
      // 브라우저는 로그인할 수 없어 참여 흐름으로 보내지 않고, 앱과 저장소가 달라 보관하지 않음
      expect(push).not.toHaveBeenCalled();
      expect(readPendingInvitation()).toBeNull();
      expect(checkButton()).toHaveProperty('disabled', false);
    });

    it('연달아 눌러도 복사·이동은 한 번이다', async () => {
      renderEntry();

      await userEvent.click(checkButton());
      await userEvent.click(checkButton());

      expect(open).toHaveBeenCalledTimes(1);
      expect(copyText).toHaveBeenCalledTimes(1);
    });

    it('복사하지 못해도 넘긴다', async () => {
      copyText.mockResolvedValueOnce(false);
      renderEntry();

      await userEvent.click(checkButton());

      expect(open).toHaveBeenCalledWith('https://open.bunch.kr/invite/ABCD2345');
      await Promise.resolve();
      expect(toast).not.toHaveBeenCalled();
    });

    it.each(['a/b', '..', '%2F%2F%2F%2F', 'short', 'x'.repeat(65)])(
      '경로를 깨뜨리거나 길이가 맞지 않는 토큰(%s)은 넘기지 않고 무효 링크로 알린다',
      async (token) => {
        renderEntry({ token });

        await userEvent.click(checkButton());

        expect(toast).toHaveBeenCalledWith('유효하지 않은 링크입니다.');
        expect(open).not.toHaveBeenCalled();
        expect(copyText).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['Android', 'Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5],
      ['Windows PC', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0],
    ])('%s는 넘기지 않고 iOS 앱만 있다고 알린다', async (_name, userAgent, points) => {
      mockDevice(userAgent, points);
      renderEntry();

      await userEvent.click(checkButton());

      expect(toast).toHaveBeenCalledWith('지금은 iOS 앱만 지원해요.');
      expect(open).not.toHaveBeenCalled();
      expect(copyText).not.toHaveBeenCalled();
    });
  });

  describe('카카오톡 인앱 브라우저(iOS)', () => {
    it('열리자마자 한 번 밖에서 다시 열기를 요청한다(앱이 있으면 앱, 없으면 Safari)', () => {
      mockDevice(KAKAOTALK_IPHONE_UA, 5);
      renderEntry();

      expect(open).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith(KAKAOTALK_REOPEN);
    });

    it('자동 요청이 막혀 남아 있으면 초대장 확인하기가 같은 요청을 다시 한다(복사는 Safari에서)', async () => {
      mockDevice(KAKAOTALK_IPHONE_UA, 5);
      renderEntry();
      open.mockClear();

      await userEvent.click(checkButton());

      expect(open).toHaveBeenCalledWith(KAKAOTALK_REOPEN);
      expect(open).toHaveBeenCalledTimes(1);
      expect(copyText).not.toHaveBeenCalled();
    });

    it('형식이 아닌 링크는 밖으로 보내지 않는다(이 페이지에서 무효 안내)', () => {
      mockDevice(KAKAOTALK_IPHONE_UA, 5);
      renderEntry({ token: 'short' });

      expect(open).not.toHaveBeenCalled();
    });

    it('Android 카카오톡은 자동으로 보내지 않는다(앱이 없음)', () => {
      mockDevice('Mozilla/5.0 (Linux; Android 15) KAKAOTALK 10.8.0', 5);
      renderEntry();

      expect(open).not.toHaveBeenCalled();
    });
  });

  describe('모션', () => {
    it('로고 묶음과 픽셀 장식 세 곳이 CSS 모션 클래스를 가진다(JS 없이 첫 페인트부터 재생)', () => {
      const { container } = renderEntry();

      for (const name of ['logo', 'pattern-left', 'pattern-right', 'module']) {
        expect(container.querySelectorAll(`.invite-rise-${name}`)).toHaveLength(1);
      }
    });

    it('장식을 JS 상태로 숨기지 않는다(숨김 클래스·인라인 투명도 없음)', () => {
      const { container } = renderEntry();

      expect(container.querySelector('.opacity-0')).toBeNull();
      expect(container.querySelector('[style*="opacity"]')).toBeNull();
    });

    it('장식은 보조 기술에서 숨기고 로고(h1)는 숨기지 않는다', () => {
      const { container } = renderEntry();

      expect(
        container.querySelectorAll('.invite-rise-pattern-left[aria-hidden="true"]'),
      ).toHaveLength(1);
      expect(container.querySelectorAll('.invite-rise-module[aria-hidden="true"]')).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1, name: 'Bunch' })).toBeTruthy();
    });
  });
});
