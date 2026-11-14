import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { bundleEdits } from '../lib/bundleEdits';
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

// 피드 응답 한 쪽(Swagger FeedResponse). 팔로우 구간 2개 → 안내 → 공개 구간 1개 → 광고
const HOUR = 3_600_000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();
const participant = (memberId: number, nickname: string, available = true) => ({
  memberId: available ? memberId : null,
  joinedAt: hoursAgo(100),
  nickname: available ? nickname : '작성자',
  imageUrl: null,
  profileAvailable: available,
  role: null,
  creator: false,
});
const card = (overrides: Record<string, unknown> & { id: number }) => ({
  bunch: { id: 1, name: '여행가조', imageUrl: null, characterType: 'TYPE_3', visibility: 'PUBLIC' },
  publishedAt: hoursAgo(48),
  title: '제주 3박4일 여행 아카이빙',
  date: '2026-07-09',
  coverImageUrl: '/mock/photos/P1.jpg',
  photos: [1, 2].map((n) => ({ id: n, imageUrl: `/mock/photos/P${n}.jpg`, position: n - 1 })),
  locations: [
    {
      id: 11,
      provider: 'kakao',
      externalId: 'a',
      name: '애월 한담해변',
      address: '제주시 애월읍',
      position: 0,
    },
    { id: 12, provider: 'kakao', externalId: 'b', name: '한라산', address: null, position: 1 },
  ],
  participants: [
    ...[1, 2, 3, 4, 5, 6].map((n) => participant(n, `멤버 ${n}`)),
    participant(7, '', false),
  ],
  likeCount: 4,
  likedByCurrentBunch: true,
  commentCount: 4,
  ...overrides,
});
const AD = {
  type: 'ADVERTISEMENT',
  advertisement: {
    id: 71,
    name: '플로디스튜디오',
    introduction: '여기서 뭉쳐봐요!',
    photoUrl: '/mock/photos/AD1.jpg',
    tags: ['최대 4인'],
    externalLink: null,
    place: {
      provider: 'kakao',
      externalId: 'ad',
      name: '플로디스튜디오',
      address: '서울숲역 도보 7분',
    },
    pinned: false,
    pinId: null,
    canPin: true,
  },
};
const FOLLOWING_ITEMS = [
  { type: 'BUNDLE', segment: 'FOLLOWING', bundle: card({ id: 1 }) },
  {
    type: 'BUNDLE',
    segment: 'FOLLOWING',
    bundle: card({
      id: 2,
      bunch: {
        id: 4,
        name: '책방산책',
        imageUrl: null,
        characterType: 'TYPE_1',
        visibility: 'PRIVATE',
      },
      publishedAt: hoursAgo(5),
      title: '노을 지는 동네 책방 투어',
      locations: [
        {
          id: 21,
          provider: 'kakao',
          externalId: 'c',
          name: '망원동 책방',
          address: '서울 마포구',
          position: 0,
        },
      ],
      participants: [participant(8, '', false), participant(1, '멤버 1'), participant(2, '멤버 2')],
      likedByCurrentBunch: false,
    }),
  },
  { type: 'FOLLOWING_CAUGHT_UP' },
];
const PUBLIC_ITEMS = [
  {
    type: 'BUNDLE',
    segment: 'PUBLIC',
    bundle: card({
      id: 3,
      bunch: {
        id: 3,
        name: '캠핑러버',
        imageUrl: null,
        characterType: 'TYPE_2',
        visibility: 'PUBLIC',
      },
      publishedAt: hoursAgo(24 * 10),
      title: '여름밤 바닷가 캠핑',
      locations: [],
      participants: [participant(1, '멤버 1'), participant(2, '멤버 2')],
      likeCount: 12,
      likedByCurrentBunch: false,
      commentCount: 0,
    }),
  },
  AD,
];
const page = (items: unknown[], nextCursor: string | null = null) => ({
  anchorTime: hoursAgo(0),
  currentBunchId: 1,
  canInteract: true,
  size: 20,
  bundleCount: items.length,
  items,
  nextCursor,
  hasNext: nextCursor !== null,
  endReached: nextCursor === null,
});
const serveFeed = (items: unknown[]) => server.use(http.get('/api/feed', () => ok(page(items))));

const renderFeed = (bunch: { id: string; name: string } | null) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  return render(<FeedScreen links={links} />, { wrapper: createQueryWrapper(client) });
};

const OWN = { id: '1', name: '여행가조' };

// 번들 카드만(광고 카드 제외)
const cards = () =>
  screen
    .getAllByRole('article')
    .filter((card) => !card.getAttribute('aria-label')?.startsWith('광고'));

const cardsLoaded = () => screen.findAllByRole('article');

// 목록 끝 표시가 관찰되면 바로 화면에 보인 것으로 알림(이어 받기)
class VisibleObserver {
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', VisibleObserver);
  serveFeed([...FOLLOWING_ITEMS, ...PUBLIC_ITEMS]);
  clearHiddenAds();
  likeStore.clear();
  bundleEdits.clear();
  push.mockClear();
  toast.mockClear();
});

describe('FeedScreen', () => {
  it('숨긴 광고는 안내 뒤 목록에서 빠지고, 초점은 끝 안내로 옮긴다', async () => {
    renderFeed(OWN);
    const ad = await screen.findByRole('article', { name: '광고 플로디스튜디오' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });

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

  it('목록 중간의 광고를 숨기면 초점은 다음 카드로 옮긴다', async () => {
    const [publicBundle] = PUBLIC_ITEMS;
    server.use(
      http.get('/api/feed', ({ request }) =>
        new URL(request.url).searchParams.get('cursor') === null
          ? ok(page([publicBundle, AD, ...FOLLOWING_ITEMS.slice(0, 1)], 'more'))
          : // 다음 쪽은 받는 중으로 남겨 끝 안내가 없는 상태
            new Promise<never>(() => {}),
      ),
    );
    renderFeed(OWN);
    const ad = await screen.findByRole('article', { name: '광고 플로디스튜디오' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });

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
    const next = screen.getByRole('article', { name: '여행가조의 번들 제주 3박4일 여행 아카이빙' });
    expect(next.contains(document.activeElement)).toBe(true);
  });

  it('공개 구간 끝에 광고 카드가 보이고, 숨긴 뒤 다시 들어오면 없다', async () => {
    const user = userEvent.setup();
    const first = renderFeed(OWN);
    const ad = await screen.findByRole('article', { name: '광고 플로디스튜디오' });
    expect(cards().at(-1)?.compareDocumentPosition(ad)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(ad.compareDocumentPosition(screen.getByText('모든 피드를 확인했어요'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    await user.click(within(ad).getByRole('button', { name: /더보기/ }));
    const sheet = await screen.findByRole('dialog', { name: /^이 장소를 숨길까요?/ });
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));
    expect(await screen.findByText('장소를 숨김 처리 했어요')).toBeTruthy();

    first.unmount();
    renderFeed(OWN);
    await cardsLoaded();
    expect(screen.queryByRole('article', { name: '광고 플로디스튜디오' })).toBeNull();
  });

  it('카드의 위치와 참여 멤버를 누르면 각 시트가 열린다', async () => {
    const user = userEvent.setup();
    renderFeed(OWN);
    await cardsLoaded();

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
    renderFeed(OWN);
    await cardsLoaded();
    const second = within(cards()[1]!);

    await user.click(second.getByRole('button', { name: /위치/ }));
    const places = (await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).closest(
      '[role="dialog"]',
    ) as HTMLElement;
    expect(within(places).getByText('망원동 책방')).toBeTruthy();
    expect(within(places).queryByText('애월 한담해변')).toBeNull();
    await user.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull(),
    );

    await user.click(second.getByRole('button', { name: /참여 멤버/ }));
    const sheet = await screen.findByRole('dialog', { name: '참여 멤버' });
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(3);
  });

  it('나간 멤버의 얼굴은 기본 이미지다', async () => {
    renderFeed(OWN);
    await cardsLoaded();

    const members = within(cards()[1]!).getByRole('button', { name: /참여 멤버/ });
    expect(members.querySelector('img')?.getAttribute('src')).toBe(DEFAULT_PROFILE_IMAGE);
  });

  it('서버 순서대로 팔로우한 번치 구간 → 구간 안내 → 공개 구간 → 끝 안내가 보인다', async () => {
    renderFeed(OWN);
    await cardsLoaded();

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
    // 경과 시간, 장소 글자(첫 장소 외 N곳), 날짜(올해도 연도)
    expect(within(cards()[0]!).getByText('2일 전')).toBeInTheDocument();
    expect(within(cards()[1]!).getByText('5시간 전')).toBeInTheDocument();
    expect(within(cards()[0]!).getByText('애월 한담해변 외 1곳')).toBeInTheDocument();
    expect(within(cards()[0]!).getByText('2026년 7월 9일')).toBeInTheDocument();
  });

  it('모르는 항목 type은 건너뛰고 나머지를 보인다', async () => {
    serveFeed([{ type: 'NEW_KIND' }, ...PUBLIC_ITEMS]);
    renderFeed(OWN);

    await cardsLoaded();
    expect(cards()).toHaveLength(1);
  });

  it('목록 끝에서 다음 쪽을 이어 받고, 마지막 쪽에서만 끝 안내를 보인다', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get('/api/feed', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return ok(cursor === 'next' ? page(PUBLIC_ITEMS) : page(FOLLOWING_ITEMS, 'next'));
      }),
    );
    renderFeed(OWN);

    await waitFor(() => expect(cards()).toHaveLength(3));
    expect(cursors).toEqual([null, 'next']);
    expect(screen.getByText('모든 피드를 확인했어요')).toBeInTheDocument();
  });

  it('번치·팔로우가 바뀌어 다음 쪽이 FEED_001이면 처음부터 다시 받는다', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get('/api/feed', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        if (cursor === 'stale') return fail(409, 'FEED_001');
        // 처음 받을 때만 다음 쪽이 있고, 다시 받은 뒤에는 한 쪽으로 끝남
        return ok(cursors.length === 1 ? page(FOLLOWING_ITEMS, 'stale') : page(PUBLIC_ITEMS));
      }),
    );
    renderFeed(OWN);

    await waitFor(() => expect(cursors).toEqual([null, 'stale', null]));
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
  });

  it('다시 받은 뒤에도 FEED_001이면 저절로 다시 받지 않고 안내와 다시 시도를 보인다', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get('/api/feed', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return cursor === 'stale' ? fail(409, 'FEED_001') : ok(page(FOLLOWING_ITEMS, 'stale'));
      }),
    );
    renderFeed(OWN);

    expect(await screen.findByRole('alert')).toHaveTextContent('피드를 더 불러오지 못했어요');
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    expect(cursors).toEqual([null, 'stale', null, 'stale']);
  });

  it('다음 쪽이 400이면 처음부터 다시 받지 않고, 다시 시도하는 동안 버튼과 초점을 유지한다', async () => {
    const user = userEvent.setup();
    const cursors: (string | null)[] = [];
    let pendingMore = false;
    server.use(
      http.get('/api/feed', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        if (cursor === null) return ok(page(FOLLOWING_ITEMS, 'bad'));
        return pendingMore ? new Promise<never>(() => {}) : fail(400, 'COMMON_001');
      }),
    );
    renderFeed(OWN);

    expect(await screen.findByRole('alert')).toHaveTextContent('피드를 더 불러오지 못했어요');
    expect(cursors).toEqual([null, 'bad']);
    expect(cards()).toHaveLength(2);

    pendingMore = true;
    const retry = screen.getByRole('button', { name: '다시 시도' });
    await user.click(retry);
    expect(retry).toBeInTheDocument();
    expect(retry).toHaveAttribute('aria-disabled', 'true');
    expect(retry).toHaveFocus();
    expect(screen.getByText('피드를 더 불러오는 중이에요')).toHaveAttribute('role', 'status');
  });

  it('다음 쪽이 그 밖의 이유로 실패하면 받은 카드는 두고 다시 시도로 이어 받는다', async () => {
    const user = userEvent.setup();
    let failMore = true;
    server.use(
      http.get('/api/feed', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor === null) return ok(page(FOLLOWING_ITEMS, 'next'));
        return failMore ? fail(500, 'X') : ok(page(PUBLIC_ITEMS));
      }),
    );
    renderFeed(OWN);

    const retry = await screen.findByRole('button', { name: '다시 시도' });
    expect(cards()).toHaveLength(2);
    expect(screen.queryByText('모든 피드를 확인했어요')).toBeNull();
    failMore = false;
    await user.click(retry);

    await waitFor(() => expect(cards()).toHaveLength(3));
    // 버튼이 사라지면 초점은 새로 받은 첫 카드로
    await waitFor(() => expect(cards()[2]!.contains(document.activeElement)).toBe(true));
  });

  it('처음 받기에 실패하면 안내와 다시 시도를 보인다', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/feed', () => fail(500, 'X'), { once: true }));
    renderFeed(OWN);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '일시적인 오류가 발생했어요. 다시 시도해 주세요',
    );
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    await cardsLoaded();
  });

  it('스크롤을 그 history 항목에 저장해 돌아오면 복원하고, 떠날 때만 화면을 붙잡는다', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '');
    const first = renderFeed(OWN);
    await cardsLoaded();
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

    const back = renderFeed(OWN);
    expect(back.container.querySelector('main')!.scrollTop).toBe(300);
    back.unmount();

    // 탭으로 새로 들어온 피드는 새 history 항목이라 저장값이 없음
    window.history.pushState(null, '');
    expect(renderFeed(OWN).container.querySelector('main')!.scrollTop).toBe(0);
  });

  it('Strict Mode에서 돌아와도 복원한 스크롤에 붙잡기 값이 겹치지 않는다', () => {
    configure({ reactStrictMode: true });
    try {
      window.history.replaceState({ feedScroll: 300 }, '');
      const { container } = renderFeed(OWN);
      const main = container.querySelector('main')!;

      expect(main.scrollTop).toBe(300);
      expect((main.firstElementChild as HTMLElement).style.transform).toBe('');
    } finally {
      configure({ reactStrictMode: false });
    }
  });

  it('헤더에 알림과 지금 번치(번치 홈)가 있고, 카드에서 누르는 곳마다 다른 화면으로 간다', async () => {
    const user = userEvent.setup();
    renderFeed(OWN);
    await cardsLoaded();

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
      '/bunches/4',
      '/bundles/1',
      '/bundles/1?focus=comments',
    ]);
  });

  it('좋아요는 서버 값으로 보이고, 누르면 화면에서 바로 바뀌고 수가 함께 바뀐다', async () => {
    const user = userEvent.setup();
    renderFeed(OWN);
    await cardsLoaded();
    expect(within(cards()[0]!).getByRole('button', { name: '좋아요 4' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const like = within(cards()[1]!).getByRole('button', { name: '좋아요 4' });

    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveAccessibleName('좋아요 5');
  });

  it('번들이 하나도 없으면 끝 안내만 보인다', async () => {
    serveFeed([]);
    renderFeed(OWN);

    expect(await screen.findByText('모든 피드를 확인했어요')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.queryByText('팔로우한 번치의 소식을 모두 확인했어요')).toBeNull();
  });

  it('내 정보를 받지 못하면 피드 대신 안내와 다시 시도를 보이고, 다시 시도로 피드까지 받는다', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/members/me', () => fail(500, 'COMMON_500'), { once: true }));
    render(<FeedScreen links={links} />, { wrapper: createQueryWrapper(createTestQueryClient()) });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '일시적인 오류가 발생했어요. 다시 시도해 주세요',
    );
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    await cardsLoaded();
  });

  it('내 정보를 받는 중에는 번치 이미지 자리만 보이고 피드는 기다리며, 실패하면 알림만 보인다', async () => {
    const requests: string[] = [];
    onTestFinished(() => server.events.removeAllListeners());
    server.events.on('request:start', ({ request }) => {
      requests.push(new URL(request.url).pathname);
    });
    server.use(http.get('/api/members/me', () => new Promise<never>(() => {})));
    const { unmount } = render(<FeedScreen links={links} />, {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });
    expect(screen.getByTestId('feed-bunch-placeholder')).toBeInTheDocument();
    expect(screen.getByText('피드를 불러오는 중이에요')).toHaveAttribute('role', 'status');
    expect(requests).not.toContain('/api/feed');
    unmount();

    server.use(http.get('/api/members/me', () => fail(500, 'COMMON_500')));
    render(<FeedScreen links={links} />, { wrapper: createQueryWrapper(createTestQueryClient()) });
    await waitFor(() => expect(screen.queryByTestId('feed-bunch-placeholder')).toBeNull());
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /번치 홈/ })).toBeNull();
  });

  it('소속 번치가 없어지면 화면에서 바꾼 좋아요를 보이지 않는다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: OWN });
    render(<FeedScreen links={links} />, { wrapper: createQueryWrapper(client) });
    await cardsLoaded();
    const publicCard = () => cards().at(-1)!;
    await userEvent.click(within(publicCard()).getByRole('button', { name: /좋아요/ }));
    expect(within(publicCard()).getByRole('button', { name: /좋아요/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: null });
    await waitFor(() =>
      expect(within(publicCard()).getByRole('button', { name: /좋아요/ })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    );
  });

  it('소속 번치가 없으면 헤더에 로고만 있고 좋아요는 안내 토스트', async () => {
    serveFeed(PUBLIC_ITEMS);
    const user = userEvent.setup();
    renderFeed(null);
    await cardsLoaded();

    expect(screen.getByRole('button', { name: 'BUNCH, 맨 위로' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '알림' })).toBeNull();

    const like = within(cards()[0]!).getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.');
    expect(like).toHaveAttribute('aria-pressed', 'false');
  });

  it('지웠거나 「멤버 공개」로 바꾼 번들은 피드에서 빠진다', async () => {
    bundleEdits.remove('1');
    bundleEdits.setMemberOnly('2', true);
    renderFeed(OWN);
    await cardsLoaded();

    expect(cards().map((card) => card.getAttribute('aria-label'))).toEqual([
      '캠핑러버의 번들 여름밤 바닷가 캠핑',
    ]);
  });
});
