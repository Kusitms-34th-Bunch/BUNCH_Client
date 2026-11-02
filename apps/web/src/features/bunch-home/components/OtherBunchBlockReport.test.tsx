import type * as DesignSystem from '@app/design-system';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 메뉴 시트가 다 닫힌 뒤 다음 시트가 열려(닫힘 애니메이션) 부하가 큰 전체 실행에서는 기본 1초보다 오래 걸릴 수 있음
const SHEET_WAIT = { timeout: 3000 };

const useBunch = (bunchId: string) =>
  sessionStorage.setItem('bunch-home:current-bunch-id', bunchId);

// 차단·팔로우 결과는 모듈 저장소에 남으므로 테스트마다 모듈을 새로 불러 처음 상태로
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  sessionStorage.clear();
});

const openMore = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '더보기' }));
  return screen.findByRole('dialog', { name: '더보기' });
};

describe('다른 번치 차단', () => {
  it('관리자는 확인 뒤 차단하고, 프로필 대신 접근 제한 화면과 차단 목록에 반영된다', async () => {
    // 퇴근런클럽: 메인 관리자
    useBunch('bunch-run');
    const user = userEvent.setup();
    const { OtherBunch } = await import('./OtherBunch');
    const { useBlockedBunches } = await import('../hooks/useBlockedBunches');
    const { useBunchFollow } = await import('../hooks/useBunchFollow');
    const { otherBunchesFixture } = await import('../fixtures/otherBunches.fixture');
    render(<OtherBunch bunchId="bunch-camping" />);

    // 팔로우 중이던 번치를 차단하면 팔로우도 해제
    await user.click(screen.getByRole('button', { name: '팔로우' }));
    await user.click(within(await openMore(user)).getByRole('button', { name: '차단하기' }));
    const confirm = await screen.findByRole(
      'dialog',
      { name: '캠핑러버 번치를 차단할까요?' },
      SHEET_WAIT,
    );
    expect(confirm).toHaveTextContent('차단하면 번치의 모든 멤버가');
    await user.click(within(confirm).getByRole('button', { name: '차단하기' }));

    expect(toast).toHaveBeenCalledWith('캠핑러버 번치를 차단했어요.', { fullWidth: true });
    const title = await screen.findByRole('heading', { level: 1, name: '볼 수 없는 번치예요' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.queryByRole('button', { name: /팔로우|팔로잉/ })).toBeNull();

    const { result: blocked } = renderHook(() => useBlockedBunches('bunch-run'));
    expect(blocked.current.blocked?.[0]).toMatchObject({ id: 'bunch-camping', name: '캠핑러버' });
    const { result: follow } = renderHook(() =>
      useBunchFollow(otherBunchesFixture['bunch-camping']),
    );
    expect(follow.current.status).toBe('none');
  });

  it('확인 시트의 「취소」는 차단하지 않는다', async () => {
    useBunch('bunch-run');
    const user = userEvent.setup();
    const { OtherBunch } = await import('./OtherBunch');
    render(<OtherBunch bunchId="bunch-camping" />);

    await user.click(within(await openMore(user)).getByRole('button', { name: '차단하기' }));
    const confirm = await screen.findByRole(
      'dialog',
      { name: '캠핑러버 번치를 차단할까요?' },
      SHEET_WAIT,
    );
    await user.click(within(confirm).getByRole('button', { name: '취소' }));

    // 시트가 닫히는 동안 뒤 화면은 접근성 트리에서 숨겨져 있어 닫힌 뒤를 기다림
    expect(
      await screen.findByRole('heading', { level: 1, name: '캠핑러버' }, SHEET_WAIT),
    ).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('일반 멤버에게는 「차단하기」가 없다', async () => {
    // 큐시즘 기프: 일반 멤버
    useBunch('bunch-gift');
    const user = userEvent.setup();
    const { OtherBunch } = await import('./OtherBunch');
    render(<OtherBunch bunchId="bunch-camping" />);

    const menu = await openMore(user);
    expect(within(menu).queryByRole('button', { name: '차단하기' })).toBeNull();
    expect(within(menu).getByRole('button', { name: '신고하기' })).toBeInTheDocument();
  });

  it('멤버 관리에서 관리자를 넘겨 일반 멤버가 되면 「차단하기」가 없다', async () => {
    useBunch('bunch-run');
    const user = userEvent.setup();
    const { OtherBunch } = await import('./OtherBunch');
    const { useBunchMembers } = await import('../hooks/useBunchMembers');
    const { result } = renderHook(() => useBunchMembers('bunch-run'));
    act(() => result.current.actions.transferOwner('member-kyungjun'));
    render(<OtherBunch bunchId="bunch-camping" />);

    const menu = await openMore(user);
    expect(within(menu).queryByRole('button', { name: '차단하기' })).toBeNull();
  });

  it('서버 렌더는 차단 여부를 몰라 프로필 내용 없이 헤더만 그린다', async () => {
    useBunch('bunch-run');
    const { OtherBunch } = await import('./OtherBunch');
    const html = renderToString(<OtherBunch bunchId="bunch-camping" />);

    expect(html).toContain('뒤로 가기');
    expect(html).not.toContain('캠핑러버');
    expect(html).not.toContain('더보기');
    expect(html).not.toContain('<h1');
  });

  it('차단한 번치의 팔로워·팔로잉·멤버 목록도 접근 제한 화면이다', async () => {
    useBunch('bunch-run');
    const { useBlockedBunches } = await import('../hooks/useBlockedBunches');
    const { OtherBunchFollows } = await import('./OtherBunchFollows');
    const { OtherBunchMembers } = await import('./OtherBunchMembers');
    const { result } = renderHook(() => useBlockedBunches('bunch-run'));
    result.current.block({ id: 'bunch-camping', name: '캠핑러버' });

    const { unmount } = render(
      <OtherBunchFollows bunchId="bunch-camping" initialTab="followers" />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '볼 수 없는 번치예요' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    unmount();

    render(<OtherBunchMembers bunchId="bunch-camping" />);
    expect(
      screen.getByRole('heading', { level: 1, name: '볼 수 없는 번치예요' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});

describe('다른 번치 신고', () => {
  it('사유를 골라야 신고할 수 있고, 기타는 상세 사유가 필요하며, 신고하면 접수 안내를 띄운다', async () => {
    useBunch('bunch-gift');
    const user = userEvent.setup();
    const { OtherBunch } = await import('./OtherBunch');
    render(<OtherBunch bunchId="bunch-camping" />);

    await user.click(within(await openMore(user)).getByRole('button', { name: '신고하기' }));
    const sheet = await screen.findByRole(
      'dialog',
      { name: '캠핑러버 번치를 신고해요' },
      SHEET_WAIT,
    );
    expect(sheet).toHaveTextContent('현재 활동 번치: 큐시즘 기프');
    const submit = within(sheet).getByRole('button', { name: '신고하기' });
    expect(submit).toBeDisabled();

    await user.click(within(sheet).getByRole('radio', { name: '기타' }));
    expect(submit).toBeDisabled();
    await user.type(within(sheet).getByRole('textbox', { name: /상세 사유/ }), '광고 계정이에요');
    expect(submit).toBeEnabled();

    await user.click(within(sheet).getByRole('radio', { name: '스팸' }));
    await user.click(submit);
    expect(toast).toHaveBeenCalledWith('신고를 접수했어요.', { fullWidth: true });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '캠핑러버 번치를 신고해요' })).toBeNull(),
    );
  });
});
