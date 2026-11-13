import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// 차단 목록 container는 가짜 서버 응답에 기댐(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { BlockedBunch } from '../../lib/types';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BunchBlockedList } from './BunchBlockedList';
import { BunchBlockedListScreen } from './BunchBlockedListScreen';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), replace: vi.fn() }) }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const BLOCKED: BlockedBunch[] = [
  { id: 'a', name: '야간러너스', blockId: '1' },
  { id: 'b', name: '주말산책', blockId: '2' },
];

const onUnblock = vi.fn((_target: BlockedBunch) => Promise.resolve());

beforeEach(() => {
  vi.clearAllMocks();
});

const renderScreen = (blocked: readonly BlockedBunch[] | undefined, canUnblock = true) =>
  render(
    <BunchBlockedListScreen
      blocked={blocked}
      canUnblock={canUnblock}
      onUnblock={onUnblock}
      onBack={vi.fn()}
    />,
  );

describe('BunchBlockedListScreen', () => {
  it('차단한 번치 수와 목록, 각 행의 차단해제 버튼을 보여 준다', () => {
    renderScreen(BLOCKED);

    expect(screen.getByText('2개')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '야간러너스차단해제',
      '주말산책차단해제',
    ]);
  });

  it('일반 멤버는 차단해제 버튼 없이 목록만 본다', () => {
    renderScreen(BLOCKED, false);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /차단해제/ })).toBeNull();
  });

  it('차단해제는 확인 창(해제하기·취소)을 거쳐 해제하고 처리가 끝나면 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    renderScreen(BLOCKED);

    await user.click(screen.getByRole('button', { name: '주말산책 차단해제' }));
    const dialog = await screen.findByRole('alertdialog', { name: '주말산책 차단을 해제할까요?' });
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['해제하기', '취소']);
    await user.click(within(dialog).getByRole('button', { name: '해제하기' }));

    await waitFor(() => expect(onUnblock).toHaveBeenCalledWith(BLOCKED[1]));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('주말산책 번치를 차단 해제했어요.', {
        icon: 'success',
      }),
    );
  });

  it('해제가 실패하면 토스트를 띄우지 않는다(실패 안내는 부르는 쪽)', async () => {
    onUnblock.mockRejectedValueOnce(new Error('failed'));
    const user = userEvent.setup();
    renderScreen(BLOCKED);

    await user.click(screen.getByRole('button', { name: '주말산책 차단해제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '해제하기' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(toast).not.toHaveBeenCalled();
  });

  it('해제가 끝나기 전에는 다른 해제를 받지 않는다', async () => {
    onUnblock.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    renderScreen(BLOCKED);

    await user.click(screen.getByRole('button', { name: '주말산책 차단해제' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '해제하기' }),
    );
    await waitFor(() => expect(onUnblock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await user.click(screen.getByRole('button', { name: '주말산책 차단해제' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onUnblock).toHaveBeenCalledTimes(1);
  });

  it('확인 창에서 취소하면 해제하지 않는다', async () => {
    const user = userEvent.setup();
    renderScreen(BLOCKED);

    await user.click(screen.getByRole('button', { name: '야간러너스 차단해제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onUnblock).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('차단한 번치가 없으면 빈 상태 안내를 보여 준다', () => {
    renderScreen([]);

    expect(screen.getByRole('heading', { name: '아직 차단한 번치가 없어요' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('전체 차단 수가 보이는 행보다 많으면 최근 것만 보인다고 알린다', () => {
    render(
      <BunchBlockedListScreen
        blocked={BLOCKED}
        total={60}
        canUnblock
        onUnblock={onUnblock}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('60개')).toBeInTheDocument();
    expect(screen.getByText('최근 차단한 2개만 보여요.')).toBeInTheDocument();
  });

  it('목록을 받는 중이면 목록도 빈 상태도 그리지 않고 로딩을 알린다', () => {
    renderScreen(undefined);

    expect(screen.getByRole('status')).toHaveTextContent(BUNCH_HOME_MESSAGES.blockedListLoading);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByRole('heading', { name: '아직 차단한 번치가 없어요' })).toBeNull();
  });
});

// 시작 데이터: 여행쥬아(내 기본 번치)가 야간러너스(10)·주말산책(11)을 차단, 나는 일반 멤버
const asAdmin = () =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.map((item) =>
      item.memberId === MOCK_MY_MEMBER_ID && item.bunchId === MOCK_BUNCH_ID
        ? { ...item, role: 'CO_OWNER' as const }
        : item,
    ),
  }));
const renderList = () =>
  render(<BunchBlockedList />, { wrapper: createQueryWrapper(createTestQueryClient()) });
const unblock = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(await screen.findByRole('button', { name: `${name} 차단해제` }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: '해제하기' }));
};

describe('BunchBlockedList(가짜 서버)', () => {
  it('일반 멤버는 최근 차단순 목록만 보고 「차단해제」가 없다', async () => {
    renderList();

    expect(await screen.findByText('2개')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '야간러너스',
      '주말산책',
    ]);
    expect(screen.queryByRole('button', { name: /차단해제$/ })).toBeNull();
  });

  it('공동 관리자는 해제하면 서버에서 빠지고 개수 줄로 초점이 간다', async () => {
    asAdmin();
    const user = userEvent.setup();
    renderList();

    await unblock(user, '야간러너스');

    await waitFor(() => expect(document.activeElement).toHaveTextContent('차단된 번치 1개'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(mockDb.get().blocks.map((block) => block.targetBunchId)).toEqual([11]);
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('야간러너스 번치를 차단 해제했어요.', {
        icon: 'success',
      }),
    );
  });

  it('마지막 번치를 해제하면 빈 상태로 바뀌고 초점이 빈 상태 제목으로 간다', async () => {
    asAdmin();
    mockDb.update((state) => ({
      ...state,
      blocks: state.blocks.filter((block) => block.targetBunchId === 11),
    }));
    const user = userEvent.setup();
    renderList();

    await unblock(user, '주말산책');

    const empty = await screen.findByRole('heading', { name: '아직 차단한 번치가 없어요' });
    await waitFor(() => expect(document.activeElement).toBe(empty));
  });

  it('해제에 실패하면 행을 그대로 두고 실패를 알린다', async () => {
    asAdmin();
    server.use(http.delete('/api/bunches/:viewerId/blocks/:targetId', () => fail(500, 'X')));
    const user = userEvent.setup();
    renderList();

    await unblock(user, '야간러너스');

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.unblockFailed));
    expect(await screen.findByText('2개')).toBeInTheDocument();
    expect(mockDb.get().blocks).toHaveLength(2);
  });

  it('목록을 처음부터 못 받으면 다시 시도 화면을 보인다', async () => {
    server.use(http.get('/api/bunches/:viewerId/blocks', () => fail(500, 'X')));
    renderList();

    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });
});
