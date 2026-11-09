import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { feedFixture } from '../fixtures/feed.fixture';
import { clearHiddenAds } from '../lib/hiddenAds';
import { likeStore } from '../lib/likeStore';
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
  return render(<FeedScreen links={links} />, { wrapper: createQueryWrapper(client) });
};

// 번들 카드만(광고 카드 제외)
const cards = () =>
  screen
    .getAllByRole('article')
    .filter((card) => !card.getAttribute('aria-label')?.startsWith('광고'));

beforeEach(() => {
  clearHiddenAds();
  likeStore.clear();
  push.mockClear();
  toast.mockClear();
});

describe('FeedScreen', () => {
  it('숨긴 광고는 안내 뒤 목록에서 빠지고, 초점은 끝 안내로 옮긴다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    renderFeed({ id: 'bunch-trip', name: '여행가조' });
    const ad = screen.getByRole('article', { name: '광고 플로디스튜디오' });

    await user.click(within(ad).getByRole('button', { name: /더보기/ }));
    const sheet = await screen.findByRole('dialog', { name: /^이 장소를 숨길까요?/ });
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));
    await screen.findByText('장소를 숨김 처리 했어요');

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText('장소를 숨김 처리 했어요')).toBeNull();
    expect(screen.getByRole('group', { name: '모든 피드를 확인했어요' })).toHaveFocus();
  });

  it('공개 구간 끝에 광고 카드가 보이고, 숨긴 뒤 다시 들어오면 없다', async () => {
    const user = userEvent.setup();
    const bunch = { id: 'bunch-trip', name: '여행가조' };
    const first = renderFeed(bunch);
    const ad = screen.getByRole('article', { name: '광고 플로디스튜디오' });
    expect(cards().at(-1)?.compareDocumentPosition(ad)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(ad.compareDocumentPosition(screen.getByText('모든 피드를 확인했어요'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    await user.click(within(ad).getByRole('button', { name: /더보기/ }));
    const sheet = await screen.findByRole('dialog', { name: /^이 장소를 숨길까요?/ });
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));
    expect(await screen.findByText('장소를 숨김 처리 했어요')).toBeTruthy();

    first.unmount();
    renderFeed(bunch);
    expect(screen.queryByRole('article', { name: '광고 플로디스튜디오' })).toBeNull();
  });

  it('카드의 위치와 참여 멤버를 누르면 각 시트가 열린다', async () => {
    const user = userEvent.setup();
    renderFeed({ id: 'bunch-trip', name: '여행가조' });

    await user.click(within(cards()[0]!).getByRole('button', { name: /위치/ }));
    expect(await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull(),
    );

    await user.click(within(cards()[0]!).getByRole('button', { name: /참여 멤버/ }));
    const sheet = await screen.findByRole('dialog', { name: '참여 멤버' });
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(7);
    expect(within(sheet).getByText('작성자')).toBeTruthy();
  });

  it('둘째 카드의 시트는 그 카드의 장소와 멤버를 보여 준다', async () => {
    const user = userEvent.setup();
    renderFeed({ id: 'bunch-trip', name: '여행가조' });
    const second = within(cards()[1]!);

    await user.click(second.getByRole('button', { name: /위치/ }));
    expect(await screen.findByText('망원동 책방')).toBeTruthy();
    expect(screen.queryByText('애월 한담해변')).toBeNull();
    await user.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByText('망원동 책방')).toBeNull());

    await user.click(second.getByRole('button', { name: /참여 멤버/ }));
    const sheet = await screen.findByRole('dialog', { name: '참여 멤버' });
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(3);
  });

  it('나간 멤버의 얼굴은 원래 이미지 대신 기본 이미지다', () => {
    renderFeed({ id: 'bunch-trip', name: '여행가조' });

    const members = within(cards()[1]!).getByRole('button', { name: /참여 멤버/ });
    expect(members.querySelector('img')?.getAttribute('src')).toContain('deleted-user');
  });

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

  it('스크롤을 그 history 항목에 저장해 돌아오면 복원하고, 떠날 때만 화면을 붙잡는다', async () => {
    const user = userEvent.setup();
    const bunch = { id: 'bunch-trip', name: '여행가조' };
    window.history.replaceState(null, '');
    const first = renderFeed(bunch);
    const main = first.container.querySelector('main')!;
    const content = main.firstElementChild as HTMLElement;

    main.scrollTop = 300;
    fireEvent.scroll(main);
    await waitFor(() =>
      expect((window.history.state as { feedScroll?: number }).feedScroll).toBe(300),
    );
    // 이동이 취소되어도 피드가 밀린 채 남지 않게, 누르기만 해서는 그대로
    await user.click(within(cards()[0]!).getByRole('button', { name: /사진 열기/ }));
    expect(main.scrollTop).toBe(300);
    expect(content.style.transform).toBe('');

    first.unmount();
    expect(main.scrollTop).toBe(0);
    expect(content.style.transform).toBe('translateY(-300px)');

    const back = renderFeed(bunch);
    expect(back.container.querySelector('main')!.scrollTop).toBe(300);
    back.unmount();

    // 탭으로 새로 들어온 피드는 새 history 항목이라 저장값이 없음
    window.history.pushState(null, '');
    expect(renderFeed(bunch).container.querySelector('main')!.scrollTop).toBe(0);
  });

  it('Strict Mode에서 돌아와도 복원한 스크롤에 붙잡기 값이 겹치지 않는다', () => {
    configure({ reactStrictMode: true });
    try {
      window.history.replaceState({ feedScroll: 300 }, '');
      const { container } = renderFeed({ id: 'bunch-trip', name: '여행가조' });
      const main = container.querySelector('main')!;

      expect(main.scrollTop).toBe(300);
      expect((main.firstElementChild as HTMLElement).style.transform).toBe('');
    } finally {
      configure({ reactStrictMode: false });
    }
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
    await user.click(within(own!).getByRole('button', { name: /사진 열기/ }));
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
    const { following, public: publicBundles, ads } = feedFixture;
    feedFixture.following = [];
    feedFixture.public = [];
    feedFixture.ads = [];
    try {
      renderFeed({ id: 'bunch-trip', name: '여행가조' });
      expect(screen.queryAllByRole('article')).toHaveLength(0);
      expect(screen.queryByText('팔로우한 번치의 소식을 모두 확인했어요')).toBeNull();
      expect(screen.getByText('모든 피드를 확인했어요')).toBeInTheDocument();
    } finally {
      feedFixture.following = following;
      feedFixture.public = publicBundles;
      feedFixture.ads = ads;
    }
  });

  it('내 정보를 받는 중에는 번치 이미지 자리, 실패하면 알림만 보인다', async () => {
    server.use(http.get('/api/members/me', () => new Promise<never>(() => {})));
    const { unmount } = render(<FeedScreen links={links} />, {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });
    expect(screen.getByTestId('feed-bunch-placeholder')).toBeInTheDocument();
    // 번치 유무를 모르는 동안 좋아요는 바뀌지 않음
    const pendingLike = within(cards()[0]!).getByRole('button', { name: /좋아요/ });
    await userEvent.click(pendingLike);
    expect(pendingLike).toHaveAttribute('aria-pressed', 'true');
    const pendingUnliked = within(cards()[1]!).getByRole('button', { name: /좋아요/ });
    await userEvent.click(pendingUnliked);
    expect(pendingUnliked).toHaveAttribute('aria-pressed', 'false');
    expect(pendingUnliked).toHaveAccessibleName('좋아요 4');
    expect(toast).not.toHaveBeenCalled();
    unmount();

    server.use(http.get('/api/members/me', () => fail(500, 'COMMON_500')));
    render(<FeedScreen links={links} />, { wrapper: createQueryWrapper(createTestQueryClient()) });
    await waitFor(() => expect(screen.queryByTestId('feed-bunch-placeholder')).toBeNull());
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /번치 홈/ })).toBeNull();

    // 실패 뒤 좋아요는 바뀌지 않고 오류를 안내
    const failedLike = within(cards()[1]!).getByRole('button', { name: /좋아요/ });
    await userEvent.click(failedLike);
    expect(failedLike).toHaveAttribute('aria-pressed', 'false');
    expect(toast).toHaveBeenCalledWith(
      '일시적인 오류가 발생했어요. 다시 시도해 주세요',
      expect.anything(),
    );
  });

  it('소속 번치가 없어지면 화면에서 바꾼 좋아요를 보이지 않는다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), {
      memberId: 'me',
      bunch: { id: 'bunch-trip', name: '여행가조' },
    });
    render(<FeedScreen links={links} />, { wrapper: createQueryWrapper(client) });
    const publicCard = () => cards().at(-1)!;
    await userEvent.click(within(publicCard()).getByRole('button', { name: /좋아요/ }));
    expect(within(publicCard()).getByRole('button', { name: /좋아요/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: null });
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(within(publicCard()).getByRole('button', { name: /좋아요/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
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
