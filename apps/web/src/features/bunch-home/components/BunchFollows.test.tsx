import type * as DesignSystem from '@app/design-system';
import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// 목록·요청은 가짜 서버 응답에 기댐(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { bunchHomeKeys } from '../queries/keys';
import { OtherBunchFollows } from './bunches/OtherBunchFollows';
import { FollowRequests } from './follows/FollowRequests';
import { MyBunchFollows } from './follows/MyBunchFollows';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
const push = vi.fn();
const replace = vi.fn();
const notFound = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace }),
  notFound,
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  server.events.removeAllListeners();
});

const renderWithQuery = (ui: ReactElement) =>
  render(ui, { wrapper: createQueryWrapper(createTestQueryClient()) });
// 내 번치(여행쥬아, 명의)가 그 번치를 팔로우하는 관계
const myFollowOf = (targetBunchId: number) =>
  mockDb
    .get()
    .follows.find(
      (follow) =>
        follow.followerBunchId === MOCK_BUNCH_ID && follow.targetBunchId === targetBunchId,
    );

describe('다른 번치 팔로워·팔로잉(가짜 서버)', () => {
  it('누른 수의 탭으로 열리고, 나 자신(명의 번치) 행에는 버튼이 없다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<OtherBunchFollows bunchId="3" initialTab="following" />);

    expect(await screen.findByRole('tab', { name: '팔로잉 8' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const mine = await screen.findByRole('listitem');
    expect(mine).toHaveTextContent('여행쥬아');
    expect(within(mine).queryByRole('button')).toBeNull();

    await user.click(screen.getByRole('tab', { name: '팔로워 23' }));
    // 최근 팔로우순, 버튼은 내 번치 명의의 상태
    expect(
      await screen.findByRole('button', { name: '산책클럽 팔로잉, 누르면 팔로우 취소' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /팔로우 요청/ })).toBeNull();
  });

  it('목록 버튼으로 서버에 팔로우·언팔로우하고, 끝나면 토스트로 알린다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<OtherBunchFollows bunchId="3" initialTab="followers" />);

    await user.click(
      await screen.findByRole('button', { name: '산책클럽 팔로잉, 누르면 팔로우 취소' }),
    );
    expect(await screen.findByRole('button', { name: '산책클럽 팔로우' })).toBeInTheDocument();
    await waitFor(() =>
      expect(toast).toHaveBeenLastCalledWith('산책클럽 번치 팔로우를 취소했어요.'),
    );
    expect(myFollowOf(5)).toBeUndefined();

    // 비공개 번치는 서버가 요청으로 처리
    await user.click(screen.getByRole('button', { name: '산책클럽 팔로우' }));
    expect(
      await screen.findByRole('button', { name: '산책클럽 요청됨, 누르면 요청 취소' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(toast).toHaveBeenLastCalledWith('산책클럽 번치에 팔로우를 요청했어요.'),
    );
    expect(myFollowOf(5)?.status).toBe('REQUESTED');
  });

  it('처리에 실패하면 버튼을 그대로 두고 실패를 알린다', async () => {
    server.use(http.put('/api/bunches/:viewerId/following/:targetId', () => fail(500, 'X')));
    const user = userEvent.setup();
    renderWithQuery(<MyBunchFollows initialTab="followers" />);

    await user.click(await screen.findByRole('button', { name: '캠핑러버 팔로우' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.followFailed));
    expect(screen.getByRole('button', { name: '캠핑러버 팔로우' })).toBeInTheDocument();
  });

  it('팔로우 승인 전의 비공개 번치는 목록을 요청하지 않고 안내를 보인다', async () => {
    const requests: string[] = [];
    server.events.on('request:start', ({ request }) => {
      requests.push(new URL(request.url).pathname);
    });
    renderWithQuery(<OtherBunchFollows bunchId="4" initialTab="followers" />);

    expect(await screen.findByRole('region', { name: '비공개 번치예요' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(requests.some((path) => /followers|following/.test(path))).toBe(false);
  });

  it('내 번치 주소면 지금 번치는 내 번치 목록으로, 다른 소속 번치는 프로필로 보낸다', async () => {
    renderWithQuery(<OtherBunchFollows bunchId={String(MOCK_BUNCH_ID)} initialTab="following" />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`${BUNCH_HOME_PATHS.follows}?tab=following`),
    );

    replace.mockClear();
    renderWithQuery(<OtherBunchFollows bunchId="2" initialTab="followers" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.otherBunch('2')));
  });

  it('서버가 본 명의와 캐시가 다르고 다시 받기도 실패하면 다시 시도 화면을 보이고, 다시 시도하면 서버 명의로 보인다', async () => {
    // 이 기기는 여행쥬아를 기본 번치로 받아 두었는데, 다른 기기에서 퇴근런클럽(2)으로 전환함(다시 받기는 실패)
    const client = createTestQueryClient();
    await client.fetchQuery(myProfileQueryOptions());
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.map((item) =>
        item.memberId === MOCK_MY_MEMBER_ID && item.bunchId === 2
          ? { ...item, lastUsedAt: '2026-11-01T09:00:00.000Z' }
          : item,
      ),
    }));
    server.use(http.get('/api/members/me', () => fail(500, 'X')));
    const user = userEvent.setup();
    render(<OtherBunchFollows bunchId="3" initialTab="followers" />, {
      wrapper: createQueryWrapper(client),
    });

    // 캐시 명의(여행쥬아)로 팔로우가 나가지 않게 버튼 대신 다시 시도
    // 다시 시도에서 home이 내 정보보다 늦게 와도 막힌 목록으로 굳지 않음(회귀)
    server.use(
      http.get('/api/bunches/:bunchId/home', async () => {
        await delay(100);
      }),
    );
    const retry = await screen.findByRole('button', { name: '다시 시도' });
    await user.click(retry);
    // 다시 받는 동안(home 지연)에도 같은 다시 시도 화면을 유지해 초점을 잃지 않음
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(retry).toBeInTheDocument();
    expect(retry).toHaveFocus();
    expect(screen.queryByRole('button', { name: /산책클럽/ })).toBeNull();

    // 내 정보를 다시 받을 수 있게 되면 서버 명의(퇴근런클럽) 기준 목록과 버튼
    server.resetHandlers();
    await user.click(await screen.findByRole('button', { name: '다시 시도' }));
    const button = await screen.findByRole('button', { name: '산책클럽 팔로우' });
    expect(button).not.toHaveAttribute('aria-disabled');
  });

  it('없는 번치는 404로 보낸다', async () => {
    renderWithQuery(<OtherBunchFollows bunchId="999" initialTab="followers" />);
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});

describe('내 번치 팔로워·팔로잉(가짜 서버)', () => {
  it('대기 요청이 있으면 팔로워 탭 맨 위 「팔로우 요청 N」 줄에서 요청 목록으로 간다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<MyBunchFollows initialTab="followers" />);

    expect(await screen.findByRole('tab', { name: '팔로워 3' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '캠핑러버 팔로우' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    await user.click(await screen.findByRole('button', { name: '팔로우 요청 3' }));
    expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.followRequests);
  });

  it('팔로잉 목록에서 언팔로우하면 행의 버튼과 팔로잉 수가 서버 값으로 바뀐다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<MyBunchFollows initialTab="following" />);

    expect(await screen.findByRole('tab', { name: '팔로잉 2' })).toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: '주말등산 팔로잉, 누르면 팔로우 취소' }),
    );
    expect(await screen.findByRole('tab', { name: '팔로잉 1' })).toBeInTheDocument();
    // 다시 받은 팔로잉 목록에서 빠짐
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    await waitFor(() =>
      expect(toast).toHaveBeenLastCalledWith('주말등산 번치 팔로우를 취소했어요.'),
    );
  });
});

describe('요청 수와 요청자 프로필', () => {
  it('요청 수를 받지 못해도 「팔로우 요청」 줄을 남겨 요청 화면에서 다시 시도할 수 있다', async () => {
    server.use(http.get('/api/bunches/:viewerId/follow-requests', () => fail(500, 'X')));
    const user = userEvent.setup();
    renderWithQuery(<MyBunchFollows initialTab="followers" />);

    await user.click(await screen.findByRole('button', { name: '팔로우 요청 확인하기' }));
    expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.followRequests);
  });

  it('요청 화면의 개수는 첫 쪽 행 수가 아니라 전체 대기 요청 수다', async () => {
    const card = { id: 7, name: '서핑크루', characterType: 'TYPE_2', visibility: 'PRIVATE' };
    server.use(
      http.get('/api/bunches/:viewerId/follow-requests', () =>
        ok({
          items: [{ id: 6, bunch: card, requestedAt: '2026-10-17T09:00:00.000Z' }],
          page: 0,
          size: 50,
          totalElements: 60,
          hasNext: true,
        }),
      ),
    );
    renderWithQuery(<FollowRequests />);

    expect(await screen.findByText('대기 중인 요청 60개')).toBeInTheDocument();
    expect(screen.getByText(BUNCH_HOME_MESSAGES.requestsMore)).toBeInTheDocument();
  });

  it('승인하면 요청한 번치의 프로필(팔로잉 수)도 다시 받게 한다', async () => {
    const client = createTestQueryClient();
    // 요청한 서핑크루(7)의 프로필을 미리 받아 둔 상태
    client.setQueryData(bunchHomeKeys.otherBunchHome('7', String(MOCK_BUNCH_ID)), {});
    const user = userEvent.setup();
    render(<FollowRequests />, { wrapper: createQueryWrapper(client) });

    await user.click(await screen.findByRole('button', { name: '서핑크루 팔로우 요청 승인' }));
    await waitFor(() =>
      expect(
        client.getQueryState(bunchHomeKeys.otherBunchHome('7', String(MOCK_BUNCH_ID)))
          ?.isInvalidated,
      ).toBe(true),
    );
  });
});

describe('번치 없는 회원', () => {
  it('목록·요청 주소로 들어오면 번치 탭(번치 없음 안내)으로 보낸다', async () => {
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter((item) => item.memberId !== MOCK_MY_MEMBER_ID),
    }));
    renderWithQuery(<MyBunchFollows initialTab="followers" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.home));

    replace.mockClear();
    renderWithQuery(<FollowRequests />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.home));
  });
});

describe('팔로우 요청 승인·거절(가짜 서버)', () => {
  it('승인하면 요청에서 빠지고 팔로워가 되며, 거절하면 관계가 없어진다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<FollowRequests />);

    const count = await screen.findByText('대기 중인 요청 3개');
    // 최근 요청순, 「N일 전」
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('맛집탐방대');

    await user.click(screen.getByRole('button', { name: '서핑크루 팔로우 요청 승인' }));
    expect(await screen.findByText('대기 중인 요청 2개')).toBe(count);
    expect(count).toHaveFocus();
    await waitFor(() =>
      expect(toast).toHaveBeenLastCalledWith('서핑크루 번치의 팔로우 요청을 승인했어요.'),
    );
    expect(mockDb.get().follows.find((f) => f.followerBunchId === 7)?.status).toBe('FOLLOWING');

    await user.click(screen.getByRole('button', { name: '맛집탐방대 팔로우 요청 거절' }));
    expect(await screen.findByText('대기 중인 요청 1개')).toBeInTheDocument();
    await waitFor(() =>
      expect(toast).toHaveBeenLastCalledWith('맛집탐방대 번치의 팔로우를 거절했어요.'),
    );
    expect(mockDb.get().follows.find((f) => f.followerBunchId === 8)).toBeUndefined();
  });

  it('다른 멤버가 먼저 처리했으면 그 결과를 알리고, 없어진 요청은 조용히 행만 뺀다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<FollowRequests />);
    await screen.findByText('대기 중인 요청 3개');

    // 화면을 연 뒤 서핑크루가 요청을 취소함: 알림 없이 행만 뺌
    mockDb.update((state) => ({
      ...state,
      follows: state.follows.filter((follow) => follow.followerBunchId !== 7),
    }));
    await user.click(screen.getByRole('button', { name: '서핑크루 팔로우 요청 승인' }));
    expect(await screen.findByText('대기 중인 요청 2개')).toBeInTheDocument();

    // 다른 멤버가 침대조아를 먼저 승인함: 거절해도 승인이 유지되고 이미 처리됐다고 알림
    mockDb.update((state) => ({
      ...state,
      follows: state.follows.map((follow) =>
        follow.followerBunchId === 9 ? { ...follow, status: 'FOLLOWING' as const } : follow,
      ),
    }));
    await user.click(screen.getByRole('button', { name: '침대조아 팔로우 요청 거절' }));
    expect(await screen.findByText('대기 중인 요청 1개')).toBeInTheDocument();
    await waitFor(() =>
      expect(toast).toHaveBeenLastCalledWith(BUNCH_HOME_MESSAGES.requestAlreadyHandled),
    );
    // 취소된 요청(서핑크루)은 알림이 없어 토스트는 이것 하나
    expect(toast).toHaveBeenCalledTimes(1);
    expect(mockDb.get().follows.find((f) => f.followerBunchId === 9)?.status).toBe('FOLLOWING');
  });

  it('처리에 실패하면 행을 남기고 실패를 알린다', async () => {
    server.use(
      http.post('/api/bunches/:viewerId/follow-requests/:requestId/decision', () => fail(500, 'X')),
    );
    const user = userEvent.setup();
    renderWithQuery(<FollowRequests />);

    await user.click(await screen.findByRole('button', { name: '서핑크루 팔로우 요청 승인' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.requestDecisionFailed),
    );
    expect(screen.getByText('대기 중인 요청 3개')).toBeInTheDocument();
  });

  it('요청을 모두 처리하면 빈 안내를 보인다', async () => {
    mockDb.update((state) => ({
      ...state,
      follows: state.follows.filter((follow) => follow.status !== 'REQUESTED'),
    }));
    renderWithQuery(<FollowRequests />);

    expect(await screen.findByText('대기 중인 요청 0개')).toBeInTheDocument();
    expect(screen.getByText(BUNCH_HOME_MESSAGES.requestsEmpty)).toBeInTheDocument();
  });
});
