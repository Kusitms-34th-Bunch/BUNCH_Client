import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_MEMBER_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { reloadTo } from '../../lib/navigation';
import { markKeepAgreed } from '../../lib/withdrawalFlow';
import { myKeys } from '../../queries/keys';
import { WithdrawalScreen } from './WithdrawalScreen';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace }) }));
vi.mock('../../lib/navigation', () => ({ openExternal: vi.fn(), reloadTo: vi.fn() }));
// 토스트 표시는 DS의 `toast()` 담당이라 호출만 차단
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

beforeEach(() => {
  push.mockClear();
  back.mockClear();
  replace.mockClear();
  vi.mocked(reloadTo).mockClear();
  vi.mocked(toast).mockClear();
});

/** 가짜 DB에서 내가 시연 번치 두 곳의 메인 관리자가 되게 함(원래 메인 관리자는 공동 관리자로) */
const makeMeOwner = () =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.map((membership) =>
      membership.bunchId > 2
        ? membership
        : membership.memberId === MOCK_MEMBER_IDS.me
          ? { ...membership, role: 'OWNER' }
          : membership.memberId === MOCK_MEMBER_IDS.admin
            ? { ...membership, role: 'CO_OWNER' }
            : membership,
    ),
  }));

// 탈퇴 뒤 BFF 로그아웃: ky afterResponse hook이 빈 본문 응답을 복제하면 happy-dom 스트림 오류(실제 브라우저는 무관), 본문 있는 200으로 대신
const allowLogout = () => server.use(http.post('/api/auth/logout', () => HttpResponse.json({})));

const renderScreen = (hasOwnedBunch = false) => {
  // 가짜 DB 기본값은 메인 관리자인 번치가 없음
  if (hasOwnedBunch) makeMeOwner();
  return render(<WithdrawalScreen />, { wrapper: createQueryWrapper() });
};

const agreeAndNext = async () => {
  await userEvent.click(screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' }));
  await userEvent.click(screen.getByRole('button', { name: '다음' }));
};

describe('WithdrawalScreen', () => {
  it('삭제되는 정보와 남는 기록을 묶음으로 보여 준다', () => {
    renderScreen();

    expect(
      screen.getByRole('heading', { level: 1, name: '탈퇴하기 전에 확인해 주세요' }),
    ).toBeTruthy();
    const items = (title: string) =>
      within(screen.getByRole('heading', { level: 2, name: title }).parentElement as HTMLElement)
        .getAllByRole('listitem')
        .map((item) => item.firstElementChild?.textContent);
    expect(items('삭제되는 정보')).toEqual([
      '계정과 개인정보',
      '사진함에 올린 내 사진',
      '작성 중인 번들',
      '번들 속 코멘트',
      '댓글',
    ]);
    expect(items('남는 기록')).toEqual(['번들']);
  });

  it('확인 체크 전에는 「다음」이 막히고, 체크하면 풀리고, 해제하면 다시 막힌다', async () => {
    renderScreen();
    const next = screen.getByRole('button', { name: '다음' });
    const agree = screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' });

    expect(next).toBeDisabled();
    await userEvent.click(agree);
    expect(next).toBeEnabled();
    await userEvent.click(agree);
    expect(next).toBeDisabled();
  });

  it('메인 관리자인 번치가 없으면 최종 확인 뒤 탈퇴하고 로그인 화면으로 간다', async () => {
    const withdrawn = vi.fn();
    const loggedOut = vi.fn();
    server.use(
      http.post('/api/members/me/withdrawal', () => {
        withdrawn();
        return HttpResponse.json({ success: true, data: null });
      }),
      http.post('/api/auth/logout', () => {
        loggedOut();
        return HttpResponse.json({});
      }),
    );
    renderScreen();

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' });
    expect(within(dialog).getByText('계정이 영구 삭제되며, 복구할 수 없어요.')).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: '탈퇴하기' }));

    await waitFor(() => expect(reloadTo).toHaveBeenCalledWith('/login'));
    // 탈퇴 뒤 이 기기의 인증 쿠키를 지움
    expect(withdrawn).toHaveBeenCalledTimes(1);
    expect(loggedOut).toHaveBeenCalledTimes(1);
  });

  it('탈퇴 뒤 BFF 로그아웃이 실패해도 탈퇴는 끝난 것으로 보고 로그인 화면으로 간다', async () => {
    server.use(http.post('/api/auth/logout', () => fail(500, 'COMMON_500')));
    renderScreen();

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '탈퇴하기' }));

    await waitFor(() => expect(reloadTo).toHaveBeenCalledWith('/login'));
    expect(toast).not.toHaveBeenCalled();
  });

  it('최종 확인 뒤 그사이 메인 관리자 번치가 생겼으면 탈퇴하지 않고 권한 이전 안내로 바꾼다', async () => {
    const withdrawn = vi.fn();
    server.use(
      http.post('/api/members/me/withdrawal', () => {
        withdrawn();
        return HttpResponse.json({ success: true, data: null });
      }),
    );
    renderScreen();
    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' });

    makeMeOwner();
    await userEvent.click(within(dialog).getByRole('button', { name: '탈퇴하기' }));

    expect(
      await screen.findByRole('alertdialog', { name: '관리자로 있는 번치가 있어요' }),
    ).toBeTruthy();
    expect(withdrawn).not.toHaveBeenCalled();
    expect(reloadTo).not.toHaveBeenCalled();
  });

  it('최종 확인에서 「취소」를 누르면 안내 화면에 그대로 남는다', async () => {
    renderScreen();

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' })).toBeChecked();
    expect(reloadTo).not.toHaveBeenCalled();
  });

  it('탈퇴 요청이 실패하면 이동하지 않고 창을 닫고 실패를 알린다', async () => {
    allowLogout();
    server.use(http.post('/api/members/me/withdrawal', () => fail(500, 'COMMON_500')));
    renderScreen();

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '탈퇴하기' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(reloadTo).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요');
    // 체크는 그대로라 바로 다시 시도할 수 있음
    expect(screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' })).toBeChecked();
  });

  it('메인 관리자인 번치가 있으면 권한 이전 안내를 띄우고 「권한 넘기러 가기」로 이동한다', async () => {
    renderScreen(true);

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '관리자로 있는 번치가 있어요' });
    expect(
      within(dialog).getByText('번치의 관리자 권한을 다른 멤버에게 넘긴 뒤 탈퇴할 수 있어요.'),
    ).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: '권한 넘기러 가기' }));

    expect(push).toHaveBeenCalledWith('/my/withdrawal/transfer');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('Strict Mode에서도 「다음」을 누르면 창이 열린다', async () => {
    configure({ reactStrictMode: true });
    try {
      renderScreen();
      await agreeAndNext();
      expect(await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' })).toBeTruthy();
    } finally {
      configure({ reactStrictMode: false });
    }
  });

  /** 탈퇴 확인 응답을 `release`를 부를 때까지 붙잡음 */
  const holdCheck = () => {
    const held = { release: () => undefined as void };
    server.use(
      http.get('/api/members/me/withdrawal/check', async () => {
        await new Promise<void>((resolve) => {
          held.release = resolve;
        });
        return HttpResponse.json({ success: true, data: { ownerBunches: [] } });
      }),
    );
    return held;
  };

  it('확인 중 다시 눌러도 창은 하나만 열고, 확인 중에도 버튼 초점을 지킨다', async () => {
    const held = holdCheck();
    renderScreen();
    await userEvent.click(screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' }));
    const next = screen.getByRole('button', { name: '다음' });
    await userEvent.click(next);
    await waitFor(() => expect(next).toHaveAttribute('aria-busy', 'true'));
    // disabled로 바꾸지 않아 초점이 빠지지 않음
    expect(next).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('넘길 번치를 확인하는 중이에요');
    await userEvent.click(next);

    held.release();

    expect(await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' })).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1);
  });

  it('확인 중 화면을 떠나면 확인이 끝나도 창을 열지 않는다', async () => {
    const held = holdCheck();
    const client = createTestQueryClient();
    const { unmount } = render(<WithdrawalScreen />, { wrapper: createQueryWrapper(client) });
    await userEvent.click(screen.getByRole('checkbox', { name: '안내 사항을 모두 확인했어요.' }));
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() =>
      expect(client.getQueryState(myKeys.ownedBunches())?.fetchStatus).toBe('fetching'),
    );

    unmount();
    held.release();

    // 확인이 끝난 뒤(위 테스트에서는 이 시점 안에 창이 열림)에도 창이 없음
    await waitFor(() =>
      expect(client.getQueryState(myKeys.ownedBunches())?.status).toBe('success'),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('관리자 번치를 확인하지 못하면 창을 띄우지 않고 실패를 알린다', async () => {
    server.use(http.get('/api/members/me/withdrawal/check', () => fail(500, 'COMMON_500')));
    renderScreen();

    await agreeAndNext();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
  });

  it('「다음」을 누를 때마다 다시 확인해, 권한을 모두 넘긴 뒤에는 최종 확인으로 간다', async () => {
    renderScreen(true);
    await agreeAndNext();
    const owner = await screen.findByRole('alertdialog', { name: '관리자로 있는 번치가 있어요' });
    await userEvent.click(within(owner).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

    // 다른 곳(권한 이전 화면)에서 두 번치의 권한을 넘긴 상태
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.map((membership) =>
        membership.bunchId > 2
          ? membership
          : membership.memberId === MOCK_MEMBER_IDS.me
            ? { ...membership, role: 'MEMBER' }
            : membership.memberId === MOCK_MEMBER_IDS.admin
              ? { ...membership, role: 'OWNER' }
              : membership,
      ),
    }));
    await userEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' })).toBeTruthy();
    expect(screen.queryByRole('alertdialog', { name: '관리자로 있는 번치가 있어요' })).toBeNull();
  });

  it('권한을 넘기고 돌아오면 확인 체크를 유지해 「다음」이 바로 풀려 있다', () => {
    markKeepAgreed(true);
    const { unmount } = render(<WithdrawalScreen />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '다음' }).disabled).toBe(false);

    // 한 번만 유지하고 다음 진입부터는 해제
    unmount();
    render(<WithdrawalScreen />, { wrapper: createQueryWrapper() });
    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(false);
  });

  it('권한 이전 화면에 주소로 바로 들어와 넘겼으면 체크를 유지하지 않는다', () => {
    markKeepAgreed(false);
    render(<WithdrawalScreen />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(false);
  });

  it('나 혼자 있는 번치는 권한을 넘길 번치로 보지 않는다', async () => {
    // 퇴근런클럽에 나만 남기고 메인 관리자로
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.flatMap((membership) =>
        membership.bunchId !== 2
          ? [membership]
          : membership.memberId === MOCK_MEMBER_IDS.me
            ? [{ ...membership, role: 'OWNER' as const }]
            : [],
      ),
    }));
    render(<WithdrawalScreen />, { wrapper: createQueryWrapper() });

    await agreeAndNext();

    expect(await screen.findByRole('alertdialog', { name: '정말 탈퇴하시겠어요?' })).toBeTruthy();
  });

  it('권한 이전 안내에서 「취소」를 누르면 이동하지 않고 닫는다', async () => {
    renderScreen(true);

    await agreeAndNext();
    const dialog = await screen.findByRole('alertdialog', { name: '관리자로 있는 번치가 있어요' });
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(push).not.toHaveBeenCalled();
  });

  it('뒤로 가기는 기록이 없으면 MY로 간다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(replace).toHaveBeenCalledWith('/my');
  });
});
