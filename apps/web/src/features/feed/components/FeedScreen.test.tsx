import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { feedFixture } from '../fixtures/feed.fixture';
import { FeedScreen } from './FeedScreen';

const push = vi.fn();
const toast = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

const links = {
  notifications: '/bunch/notifications',
  bunchHome: '/bunch',
  otherBunch: (id: string) => `/bunches/${id}`,
};

const renderFeed = (bunch: { id: string; name: string } | null) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  render(<FeedScreen links={links} />, { wrapper: createQueryWrapper(client) });
};

const cards = () => screen.getAllByRole('article');

beforeEach(() => {
  push.mockClear();
  toast.mockClear();
});

describe('FeedScreen', () => {
  it('팔로우한 번치 구간 → 구간 안내 → 공개 구간 → 끝 안내 순서로 보인다', () => {
    renderFeed({ id: 'bunch-trip', name: '여행가조' });

    expect(cards().map((card) => card.getAttribute('aria-label'))).toEqual([
      '여행가조의 번들 제주 3박4일 여행 아카이빙',
      '책방산책의 번들 노을 지는 동네 책방 투어',
      '캠핑러버의 번들 여름밤 바닷가 캠핑',
    ]);
    const notice = screen.getByText('팔로우한 번치의 소식을 모두 확인했어요');
    const [, second, third] = cards();
    expect(second?.compareDocumentPosition(notice)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(third?.compareDocumentPosition(notice)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    expect(screen.getByText('모든 피드를 확인했어요')).toBeInTheDocument();
    // 경과 시간
    expect(within(cards()[0]!).getByText('2일 전')).toBeInTheDocument();
    expect(within(cards()[1]!).getByText('5시간 전')).toBeInTheDocument();
  });

  it('헤더에 알림과 지금 번치(번치 홈)가 있고, 카드에서 누르는 곳마다 다른 화면으로 간다', async () => {
    const user = userEvent.setup();
    renderFeed({ id: 'bunch-trip', name: '여행가조' });

    expect(screen.getByRole('link', { name: '알림' })).toHaveAttribute(
      'href',
      '/bunch/notifications',
    );
    expect(screen.getByRole('link', { name: '여행가조 번치 홈' })).toHaveAttribute(
      'href',
      '/bunch',
    );

    const [own, other] = cards();
    await user.click(within(own!).getByRole('button', { name: '여행가조 2일 전' }));
    await user.click(within(other!).getByRole('button', { name: '책방산책 5시간 전' }));
    await user.click(within(own!).getByRole('button', { name: /사진 1\/4 열기/ }));
    await user.click(within(own!).getByRole('button', { name: '댓글 4' }));
    expect(push.mock.calls.map(([path]: unknown[]) => path as string)).toEqual([
      '/bunch',
      '/bunches/bunch-book',
      '/bundles/bundle-1',
      '/bundles/bundle-1?focus=comments',
    ]);
  });

  it('좋아요는 화면에서 바로 바뀌고 수가 함께 바뀐다', async () => {
    const user = userEvent.setup();
    renderFeed({ id: 'bunch-trip', name: '여행가조' });
    const like = within(cards()[1]!).getByRole('button', { name: '좋아요 4' });

    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveAccessibleName('좋아요 5');
  });

  it('두 구간이 모두 비면 끝 안내만 보인다', () => {
    const { following, public: publicBundles } = feedFixture;
    feedFixture.following = [];
    feedFixture.public = [];
    try {
      renderFeed({ id: 'bunch-trip', name: '여행가조' });
      expect(screen.queryAllByRole('article')).toHaveLength(0);
      expect(screen.queryByText('팔로우한 번치의 소식을 모두 확인했어요')).toBeNull();
      expect(screen.getByText('모든 피드를 확인했어요')).toBeInTheDocument();
    } finally {
      feedFixture.following = following;
      feedFixture.public = publicBundles;
    }
  });

  it('내 정보를 받는 중에는 번치 이미지 자리, 실패하면 알림만 보인다', async () => {
    server.use(http.get('/api/members/me', () => new Promise<never>(() => {})));
    const { unmount } = render(<FeedScreen links={links} />, {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });
    expect(screen.getByTestId('feed-bunch-placeholder')).toBeInTheDocument();
    unmount();

    server.use(http.get('/api/members/me', () => fail(500, 'COMMON_500')));
    render(<FeedScreen links={links} />, { wrapper: createQueryWrapper(createTestQueryClient()) });
    await waitFor(() => expect(screen.queryByTestId('feed-bunch-placeholder')).toBeNull());
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /번치 홈/ })).toBeNull();
  });

  it('소속 번치가 없으면 헤더에 로고만, 공개 구간만 보이고 좋아요는 안내 토스트', async () => {
    const user = userEvent.setup();
    renderFeed(null);

    expect(screen.getByRole('button', { name: 'BUNCH, 맨 위로' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '알림' })).toBeNull();
    expect(cards()).toHaveLength(1);
    expect(screen.queryByText('팔로우한 번치의 소식을 모두 확인했어요')).toBeNull();

    const like = within(cards()[0]!).getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.', expect.anything());
    expect(like).toHaveAttribute('aria-pressed', 'false');
  });
});
