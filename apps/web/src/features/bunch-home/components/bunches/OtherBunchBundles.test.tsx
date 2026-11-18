import type * as DesignSystem from '@app/design-system';
import { ApiError } from '@app/api-core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// 다른 번치 그리드는 가짜 서버의 page·size 응답에 기댐
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { PrefetchBundle } from '../../hooks/useOpenBundle';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { OtherBunch } from './OtherBunch';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  notFound: vi.fn(),
}));
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation: vi.fn() }));
type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 목록 끝 표시가 관찰되면 바로 화면에 보인 것으로 알림
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

// 공개 번치 캠핑러버(3)의 공개 번들 두 쪽
const bundle = (id: number, title: string) => ({
  id,
  bunchId: 3,
  title,
  coverImageUrl: null,
  publishedAt: '2026-11-01T00:00:00.000Z',
  visibility: 'PUBLIC',
});
const requests: number[] = [];
beforeEach(() => {
  vi.clearAllMocks();
  requests.length = 0;
  vi.stubGlobal('IntersectionObserver', VisibleObserver);
  server.use(
    http.get('/api/bunches/3/published-bundles', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      requests.push(page);
      return ok({
        items: [page === 0 ? bundle(801, '캠핑 첫 쪽') : bundle(802, '캠핑 둘째 쪽')],
        page,
        size: 1,
        totalElements: 2,
        hasNext: page === 0,
      });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const renderOther = (prefetchBundle?: PrefetchBundle) =>
  render(<OtherBunch bunchId="3" prefetchBundle={prefetchBundle} />, {
    wrapper: createQueryWrapper(createTestQueryClient()),
  });

describe('다른 번치 번들 그리드(가짜 서버)', () => {
  it('끝에서 다음 쪽을 이어 붙이고, 칸을 누르면 상세 확인 뒤 번들 상세로 간다(5.10.1 상세 5)', async () => {
    const user = userEvent.setup();
    renderOther(() => Promise.resolve());

    const second = await screen.findByRole('link', { name: '캠핑 둘째 쪽' });
    expect(screen.getByRole('link', { name: '캠핑 첫 쪽' })).toBeInTheDocument();
    expect(requests).toEqual([0, 1]);

    await user.click(second);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/bunches/3/bundles/802'));
  });

  it('삭제된 번들(상세 404)이면 이동하지 않고 안내 뒤 그리드를 다시 받는다', async () => {
    const user = userEvent.setup();
    renderOther(() =>
      Promise.reject(new ApiError({ message: 'gone', category: 'unknown', status: 404 })),
    );
    const link = await screen.findByRole('link', { name: '캠핑 첫 쪽' });
    await screen.findByRole('link', { name: '캠핑 둘째 쪽' });
    requests.length = 0;

    await user.click(link);

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.bundleDeleted));
    await waitFor(() => expect(requests).toContain(0));
    expect(push).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(link.closest('ul'));
  });
});
