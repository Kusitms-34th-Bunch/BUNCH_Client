import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { BundleSelectProvider } from '../../contexts/BundleSelectProvider';
import { RecommendDetail } from './RecommendDetail';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/features/photo-box/hooks/usePhotoBox', async () => ({
  usePhotoBox: (await import('../../testing/selectScreenDoubles')).usePhotoBoxDouble,
}));
vi.mock('../../hooks/useCreateBundle', async () => ({
  useCreateBundle: (await import('../../testing/selectScreenDoubles')).useCreateBundleDouble,
}));
vi.mock('../../fixtures/recommendation.fixture', async () => ({
  recommendationFixture: (await import('../../testing/selectScreenDoubles'))
    .legacyRecommendationFixture,
}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 앞 단계(멤버 선택)에서 멤버를 고른 상태로 시작
const renderDetail = (
  recommendationId: string | undefined,
  initialMemberIds: readonly string[] = ['gyeongjin'],
) =>
  render(
    <BundleSelectProvider initialMemberIds={initialMemberIds}>
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

    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.deletedRecommendation);
    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });

  it('멤버를 고르지 않고 들어오면 안내 없이 멤버 선택으로 보낸다', () => {
    renderDetail('nope', []);

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.members);
    expect(router.replace).not.toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
    expect(toastAfterNavigation).not.toHaveBeenCalled();
  });

  it('형식이 틀린 id(undefined)도 같은 안내로 처리한다', () => {
    renderDetail(undefined);

    expect(toastAfterNavigation).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });
});
