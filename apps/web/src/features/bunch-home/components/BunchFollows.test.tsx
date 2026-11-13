import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
const push = vi.fn();
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  notFound,
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 팔로우·요청 결과는 모듈 저장소에 남으므로 테스트마다 모듈을 새로 불러 처음 상태로
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  sessionStorage.clear();
});

const tabCount = (name: RegExp) => screen.getByRole('tab', { name }).textContent;

describe('다른 번치 팔로워·팔로잉', () => {
  it('누른 수의 탭으로 열리고, 탭을 바꿔 다른 목록을 본다', async () => {
    const user = userEvent.setup();
    const { OtherBunchFollows } = await import('./bunches/OtherBunchFollows');
    render(<OtherBunchFollows bunchId="3" initialTab="following" />);

    expect(screen.getByRole('tab', { name: '팔로잉 8' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    await user.click(screen.getByRole('tab', { name: '팔로워 23' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    // 다른 번치의 목록에는 요청 줄이 없음
    expect(screen.queryByRole('button', { name: /팔로우 요청/ })).toBeNull();
  });

  it('목록 버튼으로 바로 팔로우·언팔로우하고 토스트로 알린다', async () => {
    const user = userEvent.setup();
    const { OtherBunchFollows } = await import('./bunches/OtherBunchFollows');
    render(<OtherBunchFollows bunchId="3" initialTab="following" />);

    // 비공개 번치는 요청
    await user.click(screen.getByRole('button', { name: '책방산책 팔로우' }));
    expect(
      screen.getByRole('button', { name: '책방산책 요청됨, 누르면 요청 취소' }),
    ).toBeInTheDocument();
    expect(toast).toHaveBeenLastCalledWith('책방산책 번치에 팔로우를 요청했어요.');

    await user.click(screen.getByRole('button', { name: '주말등산 팔로잉, 누르면 팔로우 취소' }));
    expect(screen.getByRole('button', { name: '주말등산 팔로우' })).toBeInTheDocument();
    expect(toast).toHaveBeenLastCalledWith('주말등산 번치 팔로우를 취소했어요.');
  });

  it('팔로우 승인 전의 비공개 번치는 주소로 들어와도 목록 대신 안내를 보인다', async () => {
    const { OtherBunchFollows } = await import('./bunches/OtherBunchFollows');
    render(<OtherBunchFollows bunchId="4" initialTab="followers" />);

    expect(screen.getByRole('region', { name: '비공개 번치예요' })).toHaveTextContent(
      '목록을 보려면 이 번치를 팔로우하세요.',
    );
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('없는 번치는 404로 보낸다', async () => {
    const { OtherBunchFollows } = await import('./bunches/OtherBunchFollows');
    expect(() => render(<OtherBunchFollows bunchId="__proto__" initialTab="followers" />)).toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});

describe('내 번치 팔로워·팔로잉과 팔로우 요청', () => {
  beforeEach(() => {
    // 비공개인 퇴근런클럽에 대기 요청 3개
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-run');
  });

  it('대기 요청이 있으면 팔로워 탭 맨 위 「팔로우 요청 N」 줄에서 요청 목록으로 간다', async () => {
    const user = userEvent.setup();
    const { MyBunchFollows } = await import('./follows/MyBunchFollows');
    render(<MyBunchFollows initialTab="followers" />);

    expect(tabCount(/^팔로워/)).toBe('팔로워 23');
    await user.click(screen.getByRole('button', { name: '팔로우 요청 3' }));
    expect(push).toHaveBeenCalledWith('/bunch/follows/requests');

    // 팔로잉 탭에는 요청 줄이 없음
    await user.click(screen.getByRole('tab', { name: /^팔로잉/ }));
    expect(screen.queryByRole('button', { name: /팔로우 요청/ })).toBeNull();
  });

  it('승인하면 요청에서 빠지고 팔로워 맨 위에 더해지며, 거절하면 팔로워에 없다', async () => {
    const user = userEvent.setup();
    const { FollowRequests } = await import('./follows/FollowRequests');
    const { MyBunchFollows } = await import('./follows/MyBunchFollows');
    const { unmount } = render(<FollowRequests />);

    expect(screen.getByText('대기 중인 요청 3개')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '맛집탐방대 팔로우 요청 승인' }));
    expect(toast).toHaveBeenLastCalledWith('맛집탐방대 번치의 팔로우 요청을 승인했어요.');
    // 누른 버튼이 사라져 초점은 개수 줄로
    expect(screen.getByText('대기 중인 요청 2개')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: '서핑크루 팔로우 요청 거절' }));
    expect(toast).toHaveBeenLastCalledWith('서핑크루 번치의 팔로우를 거절했어요.');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    unmount();
    render(<MyBunchFollows initialTab="followers" />);
    expect(tabCount(/^팔로워/)).toBe('팔로워 24');
    expect(screen.getByRole('button', { name: '팔로우 요청 1' })).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]!).getByText('맛집탐방대')).toBeInTheDocument();
    expect(screen.queryByText('서핑크루')).toBeNull();
  });

  it('요청을 모두 처리하면 빈 안내를 보이고 팔로워 탭의 요청 줄이 사라진다', async () => {
    const user = userEvent.setup();
    const { FollowRequests } = await import('./follows/FollowRequests');
    const { MyBunchFollows } = await import('./follows/MyBunchFollows');
    const { unmount } = render(<FollowRequests />);

    for (const name of ['서핑크루', '맛집탐방대', '침대조아']) {
      await user.click(screen.getByRole('button', { name: `${name} 팔로우 요청 거절` }));
    }
    expect(screen.getByText('대기 중인 팔로우 요청이 없어요.')).toBeInTheDocument();

    unmount();
    render(<MyBunchFollows initialTab="followers" />);
    expect(screen.queryByRole('button', { name: /팔로우 요청/ })).toBeNull();
  });

  it('팔로잉 목록에서 언팔로우하면 팔로잉 수가 바로 준다', async () => {
    const user = userEvent.setup();
    const { MyBunchFollows } = await import('./follows/MyBunchFollows');
    render(<MyBunchFollows initialTab="following" />);

    expect(tabCount(/^팔로잉/)).toBe('팔로잉 8');
    await user.click(screen.getByRole('button', { name: '주말등산 팔로잉, 누르면 팔로우 취소' }));
    expect(tabCount(/^팔로잉/)).toBe('팔로잉 7');
    // 행은 그대로 두고 버튼만 바뀜(화면설계서 2500:71333 3번)
    expect(screen.getByRole('button', { name: '주말등산 팔로우' })).toBeInTheDocument();
  });
});
