import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
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
  push.mockClear();
  toast.mockClear();
});

// 지금 번치(여행쥬아)에 멤버가 나 혼자인 경우
const leaveOnlyMe = () =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.filter(
      (item) => item.bunchId !== MOCK_BUNCH_ID || item.memberId === MOCK_MY_MEMBER_ID,
    ),
  }));

const renderHome = async () => {
  render(<BunchHome />, { wrapper: createQueryWrapper(createTestQueryClient()) });
  await screen.findByRole('heading', { level: 1, name: /여행쥬아/ });
};

describe('BunchHome 번들 만들기 진입', () => {
  it('번치에 멤버가 나 혼자면 「+」가 번들 만들기로 가지 않고 멤버 초대를 안내한다', async () => {
    leaveOnlyMe();
    await renderHome();

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));

    const dialog = await screen.findByRole('alertdialog', { name: '함께할 멤버가 없어요' });
    expect(dialog).toHaveAccessibleDescription(
      '번들은 번치의 멤버가 2명 이상일 때 만들 수 있어요.',
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('「초대하기」는 멤버 초대 화면으로 이동한다', async () => {
    leaveOnlyMe();
    await renderHome();

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '초대하기' }));

    expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.invite);
  });

  it('「취소」는 창만 닫고 이동하지 않는다', async () => {
    leaveOnlyMe();
    await renderHome();

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(push).not.toHaveBeenCalled();
  });

  it('멤버가 2명 이상이면 바로 번들 만들기(멤버 선택)로 이동한다', async () => {
    await renderHome();

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));

    expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.createBundle);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('작성 중인 번들이 이미 10개면 번들 만들기로 가지 않고 한도를 알린다(기능명세 4.1.1)', async () => {
    mockDb.update((state) => {
      const base = state.bundles.find((bundle) => bundle.bunchId === MOCK_BUNCH_ID)!;
      const maxId = Math.max(...state.bundles.map((bundle) => bundle.id));
      const drafts = Array.from({ length: 10 }, (_, index) => ({
        ...base,
        id: maxId + index + 1,
        status: 'DRAFT' as const,
        publishedAt: null,
      }));
      return { ...state, bundles: [...state.bundles, ...drafts] };
    });
    // 목록 자체는 이 판단과 관계없어 비워 둠(번치 홈의 draftCount로 판단)
    server.use(
      http.get('/api/bunches/:bunchId/bundles', () =>
        ok({ items: [], page: 0, size: 50, total: 0 }),
      ),
    );
    await renderHome();

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));

    expect(toast).toHaveBeenCalledWith('번들 초안은 최대 10개까지 만들 수 있어요.');
    expect(push).not.toHaveBeenCalled();
  });
});
