import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { BundleSelectProvider } from '../contexts/BundleSelectProvider';
import { RecommendDetail } from './RecommendDetail';

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const renderDetail = (recommendationId: string | undefined) =>
  render(
    <BundleSelectProvider>
      <RecommendDetail recommendationId={recommendationId} />
    </BundleSelectProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RecommendDetail', () => {
  it('헤더에 추천 번들명을 보이고 사진을 날짜 섹션별로 보여 준다', () => {
    renderDetail('rec-1');

    expect(
      screen.getByRole('heading', { level: 1, name: '성수동 러닝 모임 상세' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
  });

  it('사진은 선택 원 없이 뷰어로 가는 링크이다', () => {
    renderDetail('rec-1');

    const links = within(screen.getByRole('main')).getAllByRole('link');
    expect(links).toHaveLength(6);
    expect(links[0]).toHaveAttribute(
      'href',
      expect.stringMatching(/\/recommendations\/rec-1\/photos\/photo-/),
    );
  });

  it('뒤로 가기는 돌아갈 기록이 없으면 사진 선택 화면으로 이동한다', async () => {
    renderDetail('rec-1');

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });

  it('없는 추천이면 안내 토스트 뒤 사진 선택 화면으로 돌아간다', () => {
    renderDetail('nope');

    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.deletedRecommendation, {
      fullWidth: true,
    });
    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });

  it('형식이 틀린 id(undefined)도 같은 안내로 처리한다', () => {
    renderDetail(undefined);

    expect(toast).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });
});
