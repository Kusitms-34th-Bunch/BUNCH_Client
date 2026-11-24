import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { MemberProfile, type MemberFollowChange } from './MemberProfile';

const push = vi.fn();
const toast = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

const links = { bunchHome: '/bunch', otherBunch: (id: string) => `/bunches/${id}` };

// 멤버 2의 참여 번치(서버 응답, 순서는 화면이 정렬). 1은 지금 내 번치라 버튼 없음
type State = 'NONE' | 'REQUESTED' | 'FOLLOWING';
let states: Record<number, State>;
const BUNCHES = [
  { id: 3, name: '캠핑러버', visibility: 'PUBLIC' as const },
  { id: 1, name: '여행쥬아', visibility: 'PRIVATE' as const },
  { id: 4, name: '책방산책', visibility: 'PRIVATE' as const },
];
const serveProfile = () =>
  server.use(
    http.get('/api/members/:memberId/social-profile', ({ params }) =>
      params.memberId === '2'
        ? ok({
            memberId: 2,
            nickname: '경진',
            imageUrl: null,
            bunches: BUNCHES.map((bunch) => ({
              bunch: { ...bunch, imageUrl: null, characterType: 'TYPE_1' },
              followState: states[bunch.id],
              followId: states[bunch.id] === 'NONE' ? null : 50 + bunch.id,
              showFollowButton: bunch.id !== 1,
            })),
          })
        : fail(404, 'RESOURCE_001'),
    ),
  );

// 번치 쪽 기능이 보내는 팔로우(route가 넘김). 서버 상태를 바꾸고 결과를 돌려줌
const follow = vi.fn((targetId: string, change: MemberFollowChange) => {
  const id = Number(targetId);
  const isPrivate = BUNCHES.find((bunch) => bunch.id === id)?.visibility === 'PRIVATE';
  states[id] = change.kind === 'unfollow' ? 'NONE' : isPrivate ? 'REQUESTED' : 'FOLLOWING';
  return Promise.resolve(states[id]);
});

const renderProfile = (
  bunch: { id: string; name: string } | null = { id: '1', name: '여행쥬아' },
  memberId = '2',
) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  render(<MemberProfile memberId={memberId} links={links} follow={follow} />, {
    wrapper: createQueryWrapper(client),
  });
};

const rows = () => screen.getAllByRole('listitem');
const profileButton = (name: RegExp) => screen.getByRole('button', { name });
const loaded = () => screen.findByRole('heading', { level: 1, name: '경진' });

beforeEach(() => {
  push.mockClear();
  toast.mockClear();
  follow.mockClear();
  states = { 1: 'NONE', 3: 'NONE', 4: 'NONE' };
  serveProfile();
});

describe('MemberProfile', () => {
  it('서버의 닉네임과 참여 번치를 정렬해 보여 준다', async () => {
    renderProfile();

    await loaded();
    expect(screen.getByRole('heading', { level: 2, name: '참여중인 번치' })).toBeTruthy();
    expect(rows().map((row) => row.querySelector('[title]')?.textContent)).toEqual([
      '여행쥬아',
      '책방산책',
      '캠핑러버',
    ]);
  });

  it('받는 동안 불러오는 중을 알린다', () => {
    renderProfile();
    expect(screen.getByRole('status')).toHaveTextContent('멤버 프로필을 불러오는 중이에요');
  });

  it('비공개 번치는 글자로도 알리고, 현재 번치 자신의 줄에는 팔로우 버튼이 없다', async () => {
    renderProfile();
    await loaded();

    expect(profileButton(/^책방산책.*비공개 번치$/)).toBeTruthy();
    expect(within(rows()[0]!).getAllByRole('button')).toHaveLength(1);
    expect(within(rows()[1]!).getByRole('button', { name: '책방산책 팔로우' })).toBeTruthy();
  });

  it('번치 줄을 누르면 그 번치 프로필, 현재 번치면 번치 메인으로 간다', async () => {
    const user = userEvent.setup();
    renderProfile();
    await loaded();

    await user.click(profileButton(/^캠핑러버$/));
    expect(push).toHaveBeenLastCalledWith('/bunches/3');

    await user.click(profileButton(/^여행쥬아.*비공개 번치$/));
    expect(push).toHaveBeenLastCalledWith('/bunch');
  });

  it('공개 번치는 팔로우하면 서버 값으로 「팔로잉」이 되고, 취소는 관계 ID로 보낸다', async () => {
    const user = userEvent.setup();
    renderProfile();
    await loaded();

    await user.click(screen.getByRole('button', { name: '캠핑러버 팔로우' }));
    expect(follow).toHaveBeenLastCalledWith('3', { kind: 'follow' });
    await waitFor(() => expect(toast).toHaveBeenLastCalledWith('캠핑러버 번치를 팔로우했어요.'));

    await user.click(
      await screen.findByRole('button', { name: '캠핑러버 팔로잉, 누르면 팔로우 취소' }),
    );
    expect(follow).toHaveBeenLastCalledWith('3', { kind: 'unfollow', followId: '53' });
    await waitFor(() =>
      expect(toast).toHaveBeenLastCalledWith('캠핑러버 번치 팔로우를 취소했어요.'),
    );
    expect(await screen.findByRole('button', { name: '캠핑러버 팔로우' })).toBeTruthy();
  });

  it('비공개 번치는 「요청됨」이 되고 요청을 취소할 수 있다', async () => {
    const user = userEvent.setup();
    renderProfile();
    await loaded();

    await user.click(screen.getByRole('button', { name: '책방산책 팔로우' }));
    const requested = await screen.findByRole('button', {
      name: '책방산책 요청됨, 누르면 요청 취소',
    });
    // 요청은 토스트 없이 버튼만 바뀜(기능명세 6.3.3 → 5.10.3)
    expect(toast).not.toHaveBeenCalled();

    await user.click(requested);
    await waitFor(() => expect(toast).toHaveBeenLastCalledWith('팔로우 요청을 취소했어요.'));
  });

  it('보내고 다시 받는 동안 같은 번치를 다시 눌러도 한 번만 보낸다', async () => {
    let finish: (_state: State) => void = () => {};
    follow.mockImplementationOnce(
      () =>
        new Promise<State>((resolve) => {
          finish = (state) => {
            states[3] = state;
            resolve(state);
          };
        }),
    );
    const user = userEvent.setup();
    renderProfile();
    await loaded();

    const button = screen.getByRole('button', { name: '캠핑러버 팔로우' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    expect(follow).toHaveBeenCalledTimes(1);

    finish('FOLLOWING');
    expect(
      await screen.findByRole('button', { name: '캠핑러버 팔로잉, 누르면 팔로우 취소' }),
    ).not.toHaveAttribute('aria-busy');
  });

  it('팔로우가 실패하면 성공 안내 없이 서버 값으로 다시 맞춘다', async () => {
    follow.mockRejectedValueOnce(new Error('fail'));
    const user = userEvent.setup();
    renderProfile();
    await loaded();

    await user.click(screen.getByRole('button', { name: '캠핑러버 팔로우' }));

    await waitFor(() => expect(follow).toHaveBeenCalledTimes(1));
    expect(toast).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '캠핑러버 팔로우' })).toBeTruthy();
  });

  it('팔로우 뒤 다시 받기가 실패하면 옛 버튼 대신 안내와 다시 시도를 보인다', async () => {
    const user = userEvent.setup();
    renderProfile();
    await loaded();
    server.use(
      http.get('/api/members/:memberId/social-profile', () => fail(500, 'COMMON_999'), {
        once: true,
      }),
    );

    await user.click(screen.getByRole('button', { name: '캠핑러버 팔로우' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했어요');
    expect(screen.queryByRole('button', { name: '캠핑러버 팔로우' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(
      await screen.findByRole('button', { name: '캠핑러버 팔로잉, 누르면 팔로우 취소' }),
    ).toBeTruthy();
  });

  it('받아 둔 프로필이 있어도 다시 받을 때 볼 수 없게 되면 안내만 보인다', async () => {
    const user = userEvent.setup();
    renderProfile();
    await loaded();
    server.use(http.get('/api/members/:memberId/social-profile', () => fail(404, 'RESOURCE_001')));

    await user.click(screen.getByRole('button', { name: '캠핑러버 팔로우' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '삭제되었거나 볼 수 없는 내용이에요' }),
    ).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('소속 번치가 없으면 모두 「팔로우」이고 눌러도 보내지 않으며 안내한다', async () => {
    const user = userEvent.setup();
    renderProfile(null);
    await loaded();

    await user.click(screen.getByRole('button', { name: '캠핑러버 팔로우' }));

    expect(follow).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.');
  });

  it('지금 번치를 받는 중에는 멤버 프로필을 받지 않고 불러오는 중이다', () => {
    server.use(http.get('/api/members/me', () => new Promise<never>(() => {})));
    render(<MemberProfile memberId="2" links={links} follow={follow} />, {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    expect(screen.getByRole('status')).toHaveTextContent('멤버 프로필을 불러오는 중이에요');
  });

  it('받지 못하면 안내와 다시 시도를 보이고, 다시 시도하면 받는다', async () => {
    server.use(
      http.get('/api/members/:memberId/social-profile', () => fail(500, 'COMMON_999'), {
        once: true,
      }),
    );
    const user = userEvent.setup();
    renderProfile();

    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했어요');
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await loaded()).toBeTruthy();
  });

  it('다시 시도로 받으면 멤버 이름 제목으로 초점을 옮긴다', async () => {
    server.use(
      http.get('/api/members/:memberId/social-profile', () => fail(500, 'COMMON_999'), {
        once: true,
      }),
    );
    const user = userEvent.setup();
    renderProfile();

    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: '경진' })),
    );
  });

  it('다시 받는 사이 뒤로 가기로 옮긴 초점은 받은 뒤에도 그대로 둔다', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get('/api/members/:memberId/social-profile', () => fail(500, 'COMMON_999'), {
        once: true,
      }),
    );
    const user = userEvent.setup();
    renderProfile();

    await screen.findByRole('alert');
    // 두 번째 요청은 풀어 줄 때까지 기다렸다가 기본 응답으로 넘김
    server.use(
      http.get(
        '/api/members/:memberId/social-profile',
        async () => {
          await gate;
        },
        { once: true },
      ),
    );
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    const back = screen.getByRole('button', { name: '뒤로 가기' });
    back.focus();
    release();

    expect(await loaded()).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '뒤로 가기' }));
  });

  it('없거나 볼 수 없는 멤버면 안내만 보여 준다', async () => {
    renderProfile(undefined, '999');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '삭제되었거나 볼 수 없는 내용이에요',
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
