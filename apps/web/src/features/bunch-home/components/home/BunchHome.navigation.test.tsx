import type * as DesignSystem from '@app/design-system';
import { ApiError } from '@app/api-core';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { PrefetchBundle } from '../../hooks/useOpenBundle';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BunchHome } from './BunchHome';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  server.events.removeAllListeners();
});

const renderHome = async (props: Parameters<typeof BunchHome>[0] = {}) => {
  render(<BunchHome {...props} />, { wrapper: createQueryWrapper(createTestQueryClient()) });
  await screen.findByRole('heading', { level: 1, name: /여행쥬아/ });
};
// 완성된 번들 그리드의 첫 칸(번들 상세 링크)
const firstBundleLink = () =>
  screen
    .getAllByRole('link')
    .find((link) => link.getAttribute('href')?.startsWith(`/bunches/${MOCK_BUNCH_ID}/bundles/`));

describe('BunchHome 이동 연결', () => {
  it('멤버 수는 멤버 목록 링크다(5.1.4 상세 5)', async () => {
    await renderHome();

    expect(screen.getByRole('link', { name: /멤버$/ })).toHaveAttribute('href', '/bunch/members');
  });

  it('주소로 「작성 중인 번들」 탭을 고르면 그 탭부터 보인다(5.12.2)', async () => {
    await renderHome({ initialTab: 'draft' });

    expect(screen.getByRole('tab', { name: '작성 중인 번들' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('작성 중인 번들 탭으로 열었어도 번치를 전환하면 완성된 번들 탭으로 돌아간다', async () => {
    const user = userEvent.setup();
    await renderHome({ initialTab: 'draft' });

    await user.click(screen.getByRole('button', { name: /여행쥬아/ }));
    const sheet = await screen.findByRole('dialog', { name: '번치 전환하기' });
    await user.click(await within(sheet).findByRole('button', { name: /퇴근런클럽/ }));

    await screen.findByRole('heading', { level: 1, name: /퇴근런클럽/ });
    expect(screen.getByRole('tab', { name: '완성된 번들' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('그리드 칸을 누르면 상세를 확인한 뒤 번들 상세로 이동한다(5.1.5)', async () => {
    const user = userEvent.setup();
    const prefetchBundle = vi.fn<PrefetchBundle>(() => Promise.resolve());
    await renderHome({ prefetchBundle });
    const link = firstBundleLink();
    if (!link) throw new Error('완성된 번들이 없습니다.');

    await user.click(link);

    await waitFor(() => expect(push).toHaveBeenCalledWith(link.getAttribute('href')));
    expect(prefetchBundle).toHaveBeenCalledWith(
      String(MOCK_BUNCH_ID),
      expect.any(String),
      String(MOCK_BUNCH_ID),
    );
  });

  it('삭제된 번들(상세 404)이면 이동하지 않고 「삭제된 번들이에요.」 뒤 그리드를 다시 받는다', async () => {
    const user = userEvent.setup();
    const prefetchBundle = vi.fn<PrefetchBundle>(() =>
      Promise.reject(new ApiError({ message: 'gone', category: 'unknown', status: 404 })),
    );
    await renderHome({ prefetchBundle });
    const requests: string[] = [];
    server.events.on('request:start', ({ request }) => {
      requests.push(new URL(request.url).pathname);
    });
    const link = firstBundleLink();
    if (!link) throw new Error('완성된 번들이 없습니다.');

    await user.click(link);

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.bundleDeleted));
    await waitFor(() =>
      expect(requests).toContain(`/api/bunches/${MOCK_BUNCH_ID}/published-bundles`),
    );
    expect(push).not.toHaveBeenCalled();
    // 누른 칸이 사라져도 초점이 문서 처음으로 빠지지 않게 그리드로
    expect(document.activeElement).toBe(link.closest('ul'));
  });
});
