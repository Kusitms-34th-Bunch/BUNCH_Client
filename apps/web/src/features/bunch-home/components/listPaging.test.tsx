import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// 이어서 받기는 가짜 서버의 page·size 응답에 기댐(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { OtherBunch } from './bunches/OtherBunch';
import { OtherBunchFollows } from './bunches/OtherBunchFollows';
import { BunchHome } from './home/BunchHome';
import { BunchBlockedList } from './menu/BunchBlockedList';
import { BunchNotifications } from './notifications/BunchNotifications';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  notFound: vi.fn(),
}));
vi.mock('@/shared/lib/navigation/toastAfterNavigation', () => ({ toastAfterNavigation: vi.fn() }));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

// 목록 끝 표시가 관찰되면 바로 화면에 보인 것으로 알림(피드 테스트와 같은 방식)
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

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', VisibleObserver);
});
afterEach(() => {
  vi.unstubAllGlobals();
  server.events.removeAllListeners();
});

const renderWithQuery = (ui: ReactElement) =>
  render(ui, { wrapper: createQueryWrapper(createTestQueryClient()) });
const pageOf = (request: Request) => Number(new URL(request.url).searchParams.get('page'));
const card = (id: number, name: string) => ({
  id,
  name,
  imageUrl: null,
  characterType: 'TYPE_1',
  visibility: 'PUBLIC',
});
// 두 쪽짜리 목록: 첫 쪽 뒤 hasNext, 둘째 쪽에서 끝
const twoPages = <T,>(first: T, second: T) => ({
  page: (page: number) => ({
    items: [page === 0 ? first : second],
    page,
    size: 1,
    totalElements: 2,
    hasNext: page === 0,
  }),
});

// 내 번치 알림을 51개로(최신순이라 앞 번호가 더 최근)
const seedNotifications = () => {
  const base = mockDb.get().notifications.find((item) => item.bunchId === MOCK_BUNCH_ID);
  if (!base) throw new Error('시작 데이터에 알림이 없습니다.');
  mockDb.update((state) => ({
    ...state,
    notifications: Array.from({ length: 51 }, (_, index) => ({
      ...base,
      id: 1000 + index,
      title: `알림 ${index + 1}`,
      createdAt: new Date(Date.UTC(2026, 10, 1) - index * 60_000).toISOString(),
    })),
  }));
};

describe('목록 이어서 불러오기(가짜 서버)', () => {
  it('알림은 첫 50개 뒤 목록 끝에서 51번째부터 받는다(5.12.1 로직 3)', async () => {
    seedNotifications();
    const pages: number[] = [];
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname.endsWith('/notifications')) pages.push(pageOf(request));
    });
    renderWithQuery(<BunchNotifications />);

    expect(await screen.findByText('알림 51')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(51);
    expect(pages).toEqual([0, 1]);
  });

  it('「다시 시도」로 마지막 쪽을 받으면 새로 붙은 첫 항목으로 초점이 간다', async () => {
    seedNotifications();
    let failNext = true;
    server.use(
      http.get('/api/bunches/:bunchId/notifications', ({ request }) => {
        if (pageOf(request) !== 1 || !failNext) return undefined;
        failNext = false;
        return fail(500, 'X');
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<BunchNotifications />);

    await user.click(await screen.findByRole('button', { name: BUNCH_HOME_MESSAGES.moreRetry }));

    // 마지막 쪽이라 「다시 시도」 영역이 사라져도 문서 처음으로 빠지지 않음
    const added = await screen.findByRole('button', { name: /알림 51/ });
    await waitFor(() => expect(document.activeElement).toBe(added));
  });

  it('51번째 이후에 차단한 번치도 끝까지 받아 차단으로 판단한다(접근 제한)', async () => {
    const block = (id: number, bunchId: number, name: string) => ({
      id,
      bunch: card(bunchId, name),
      blockedAt: '2026-11-01T00:00:00.000Z',
    });
    const list = twoPages(block(1, 10, '야간러너스'), block(2, 3, '캠핑러버'));
    server.use(
      http.get('/api/bunches/:viewerId/blocks', ({ request }) => ok(list.page(pageOf(request)))),
    );
    renderWithQuery(<OtherBunch bunchId="3" />);

    expect(
      await screen.findByRole('heading', { name: BUNCH_HOME_MESSAGES.blockedBunchTitle }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: '캠핑러버' })).toBeNull();
  });

  it('다음 쪽이 실패하면 받은 목록은 두고 안내하며, 「다시 시도」로 그 쪽부터 받는다', async () => {
    let failNext = true;
    const list = twoPages(
      { id: 1, bunch: card(1, '여행쥬아'), blockedAt: '2026-11-01T00:00:00.000Z' },
      { id: 2, bunch: card(3, '캠핑러버'), blockedAt: '2026-10-01T00:00:00.000Z' },
    );
    server.use(
      http.get('/api/bunches/:viewerId/blocks', ({ request }) => {
        const page = pageOf(request);
        if (page === 1 && failNext) {
          failNext = false;
          return fail(500, 'X');
        }
        return ok(list.page(page));
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<BunchBlockedList />);

    const retry = await screen.findByRole('button', { name: '다시 시도' });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(
      screen
        .getAllByRole('status')
        .some((status) => status.textContent === BUNCH_HOME_MESSAGES.moreFailed),
    ).toBe(true);

    await user.click(retry);

    expect(await screen.findByText('캠핑러버')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    // 일반 멤버라 새 행에 버튼이 없어 목록으로 초점
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('list')));
    await waitFor(() => expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull());
  });

  it('번치 홈 완성된 번들 그리드는 끝에서 다음 쪽을 이어 붙인다(5.1.5)', async () => {
    const bundle = (id: number, title: string) => ({
      id,
      bunchId: MOCK_BUNCH_ID,
      title,
      coverImageUrl: null,
      publishedAt: '2026-11-01T00:00:00.000Z',
      visibility: 'PUBLIC',
    });
    const list = twoPages(bundle(901, '첫 쪽 번들'), bundle(902, '둘째 쪽 번들'));
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles', ({ request }) =>
        ok(list.page(pageOf(request))),
      ),
    );
    renderWithQuery(<BunchHome />);

    expect(await screen.findByRole('link', { name: '둘째 쪽 번들' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '첫 쪽 번들' })).toBeInTheDocument();
  });

  it('팔로워 목록은 끝에서 다음 쪽을 이어 붙인다(5.11.1 로직 4)', async () => {
    const row = (id: number, name: string) => ({
      bunch: card(id, name),
      followState: 'NONE',
      followedAt: '2026-11-01T00:00:00.000Z',
    });
    const list = twoPages(row(901, '첫쪽번치'), row(902, '둘째쪽번치'));
    server.use(
      http.get('/api/bunches/:targetId/followers', ({ request }) => ok(list.page(pageOf(request)))),
    );
    renderWithQuery(<OtherBunchFollows bunchId="3" initialTab="followers" />);

    const panel = await screen.findByRole('tabpanel');
    expect(await within(panel).findByText('둘째쪽번치')).toBeInTheDocument();
    expect(within(panel).getByText('첫쪽번치')).toBeInTheDocument();
  });
});
