import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { MemberProfileScreen } from './MemberProfileScreen';

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

const renderProfile = (
  bunch: { id: string; name: string } | null = { id: '1', name: '여행쥬아' },
  memberId = 'member-2',
) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  render(<MemberProfileScreen memberId={memberId} links={links} />, {
    wrapper: createQueryWrapper(client),
  });
};

const rows = () => screen.getAllByRole('listitem');
const profileButton = (name: RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  push.mockClear();
  toast.mockClear();
});

describe('MemberProfileScreen', () => {
  it('닉네임과 참여 번치를 정렬해 보여 준다', () => {
    renderProfile();

    expect(screen.getByRole('heading', { level: 1, name: '멤버 2' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: '참여중인 번치' })).toBeTruthy();
    expect(rows().map((row) => row.querySelector('[title]')?.textContent)).toEqual([
      '여행쥬아',
      '책방산책',
      '캠핑러버',
    ]);
  });

  it('비공개 번치는 글자로도 알리고, 현재 번치 자신의 줄에는 팔로우 버튼이 없다', () => {
    renderProfile();

    expect(profileButton(/^책방산책.*비공개 번치$/)).toBeTruthy();
    expect(within(rows()[0]!).getAllByRole('button')).toHaveLength(1);
    expect(within(rows()[1]!).getByRole('button', { name: '책방산책 팔로우' })).toBeTruthy();
  });

  it('번치 줄을 누르면 그 번치 프로필, 현재 번치면 번치 메인으로 간다', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(profileButton(/^캠핑러버$/));
    expect(push).toHaveBeenLastCalledWith('/bunches/3');

    await user.click(profileButton(/^여행쥬아.*비공개 번치$/));
    expect(push).toHaveBeenLastCalledWith('/bunch');
  });

  it('공개 번치는 팔로우 ↔ 팔로잉으로 바뀌고 안내한다', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: '캠핑러버 팔로우' }));
    expect(toast).toHaveBeenLastCalledWith('캠핑러버 번치를 팔로우했어요.');

    await user.click(screen.getByRole('button', { name: '캠핑러버 팔로잉, 누르면 팔로우 취소' }));
    expect(toast).toHaveBeenLastCalledWith('캠핑러버 번치 팔로우를 취소했어요.');
    expect(screen.getByRole('button', { name: '캠핑러버 팔로우' })).toBeTruthy();
  });

  it('비공개 번치는 팔로우 ↔ 요청됨으로 바뀌고 안내한다', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: '책방산책 팔로우' }));
    expect(toast).toHaveBeenLastCalledWith('책방산책 번치에 팔로우를 요청했어요.');

    await user.click(screen.getByRole('button', { name: '책방산책 요청됨, 누르면 요청 취소' }));
    expect(toast).toHaveBeenLastCalledWith('책방산책 번치 팔로우 요청을 취소했어요.');
    expect(screen.getByRole('button', { name: '책방산책 팔로우' })).toBeTruthy();
  });

  it('소속 번치가 없으면 모두 「팔로우」이고 눌러도 바뀌지 않으며 안내한다', async () => {
    const user = userEvent.setup();
    renderProfile(null);

    await user.click(screen.getByRole('button', { name: '캠핑러버 팔로우' }));

    expect(screen.getByRole('button', { name: '캠핑러버 팔로우' })).toBeTruthy();
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.');
  });

  it('지금 번치를 받는 중에는 번치 줄을 누를 수 없고 팔로우 버튼도 없다', () => {
    server.use(http.get('/api/members/me', () => new Promise<never>(() => {})));
    render(<MemberProfileScreen memberId="member-2" links={links} />, {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    expect(screen.getByText('캠핑러버')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /캠핑러버/ })).toBeNull();
  });

  it('내 정보 조회가 실패하면 줄과 버튼을 보이고, 팔로우를 누르면 오류를 안내한다', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/members/me', () => fail(500, 'COMMON_500')));
    render(<MemberProfileScreen memberId="member-2" links={links} />, {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    const follow = await screen.findByRole('button', { name: '캠핑러버 팔로우' });
    expect(profileButton(/^캠핑러버$/)).toBeTruthy();
    await user.click(follow);

    expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요');
    expect(screen.getByRole('button', { name: '캠핑러버 팔로우' })).toBeTruthy();
  });

  it.each(['unknown', 'member-999'])('없는 멤버(%s)면 안내만 보여 준다', (memberId) => {
    renderProfile(undefined, memberId);

    expect(
      screen.getByRole('heading', { level: 1, name: '삭제되었거나 볼 수 없는 내용이에요' }),
    ).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
