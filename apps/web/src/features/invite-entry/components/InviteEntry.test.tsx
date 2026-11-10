import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { clearPendingInvitation, readPendingInvitation } from '@/shared/lib/pendingInvitation';
import { createQueryWrapper } from '@/shared/query/testing';
import { InviteEntry } from './InviteEntry';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
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
describe('InviteEntry', () => {
  beforeEach(() => {
    push.mockClear();
    toast.mockClear();
    clearPendingInvitation();
  });

  it('로고(제목)와 소개 문구, 두 버튼을 보여 준다', () => {
    renderEntry();

    expect(screen.getByRole('heading', { level: 1, name: 'Bunch' })).toBeTruthy();
    expect(screen.getByText('함께한 순간이 모이는 곳')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('button', { name: '앱 설치하기' })).toBeTruthy();
    expect(checkButton()).toBeTruthy();
  });

  it('버튼 색은 Figma대로 앱 설치하기는 회색(secondary), 초대장 확인하기는 브랜드색이다', () => {
    renderEntry();

    expect(screen.getByRole('button', { name: '앱 설치하기' }).className).toContain(
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
    expect(anchor?.contains(screen.getByRole('button', { name: '앱 설치하기' }))).toBe(true);
  });

  it('앱스토어 연결 전에도 앱 설치하기는 활성 모양이고, 누르면 곧 지원된다는 안내만 보인다', async () => {
    renderEntry();
    const install = screen.getByRole('button', { name: '앱 설치하기' });
    expect(install).toHaveProperty('disabled', false);

    await userEvent.click(install);

    expect(toast).toHaveBeenCalledWith('앱스토어 이동은 곧 지원돼요.');
    expect(push).not.toHaveBeenCalled();
  });

  it('앱스토어를 연결하면(onInstallApp) 그 동작을 호출한다', async () => {
    const onInstallApp = vi.fn();
    renderEntry({ onInstallApp });

    await userEvent.click(screen.getByRole('button', { name: '앱 설치하기' }));

    expect(onInstallApp).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
  });

  it('초대장 확인하기는 공개 조회로 유효성을 확인하고, 유효하면 초대를 보관한 뒤 이어 간다', async () => {
    let path = '';
    server.use(
      http.get('/api/invitations/:token', ({ request }) => {
        path = new URL(request.url).pathname;
        return ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' });
      }),
    );
    renderEntry();

    await userEvent.click(checkButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith(CONTINUE));
    expect(path).toBe('/api/invitations/ABCD2345');
    expect(readPendingInvitation()).toBe('ABCD2345');
    expect(toast).not.toHaveBeenCalled();
  });

  it.each(['a/b', '..', '%2F%2F%2F%2F', 'short', 'x'.repeat(65)])(
    '경로를 깨뜨리거나 길이가 맞지 않는 토큰(%s)은 서버에 묻지 않고 무효 링크로 알린다',
    async (token) => {
      let called = false;
      server.use(
        http.get('/api/invitations/:token', () => {
          called = true;
          return ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' });
        }),
      );
      renderEntry({ token });

      await userEvent.click(checkButton());

      expect(toast).toHaveBeenCalledWith('유효하지 않은 링크입니다.');
      expect(called).toBe(false);
      expect(push).not.toHaveBeenCalled();
      expect(readPendingInvitation()).toBeNull();
    },
  );

  it('두 번 눌러도 확인 요청은 한 번만 보낸다', async () => {
    let calls = 0;
    server.use(
      http.get('/api/invitations/:token', () => {
        calls += 1;
        return ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' });
      }),
    );
    renderEntry();

    await userEvent.click(checkButton());
    await userEvent.click(checkButton());

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(calls).toBe(1);
  });

  it('없거나 만료된 링크(INVITE_001)는 알리고 이동하지 않으며 초대를 보관하지 않는다', async () => {
    server.use(http.get('/api/invitations/:token', () => fail(404, 'INVITE_001')));
    renderEntry();

    await userEvent.click(checkButton());

    await waitFor(() => expect(toast).toHaveBeenCalledWith('유효하지 않은 링크입니다.'));
    expect(push).not.toHaveBeenCalled();
    expect(readPendingInvitation()).toBeNull();
    // 다시 누를 수 있는 상태 유지
    expect(checkButton()).toHaveProperty('disabled', false);
  });

  it('그 밖의 오류는 일시적 오류로 알리고 다시 시도할 수 있다', async () => {
    let calls = 0;
    server.use(
      http.get('/api/invitations/:token', () =>
        ++calls === 1
          ? fail(503, 'AUTH_018')
          : ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' }),
      ),
    );
    renderEntry();

    await userEvent.click(checkButton());
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(checkButton());
    await waitFor(() => expect(push).toHaveBeenCalledWith(CONTINUE));
  });

  it('확인하는 동안 숨김 안내와 함께 확인하기가 잠긴다', async () => {
    let finish!: () => void;
    server.use(
      http.get('/api/invitations/:token', async () => {
        await new Promise<void>((resolve) => (finish = resolve));
        return ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' });
      }),
    );
    renderEntry();
    expect(screen.getByRole('status').textContent).toBe('');

    await userEvent.click(checkButton());
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('초대 링크를 확인하는 중이에요'),
    );
    expect(checkButton()).toHaveProperty('disabled', true);

    finish();
    await waitFor(() => expect(push).toHaveBeenCalled());
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
