import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../../constants/selectPaths';
import { BundleSelectProvider } from '../../contexts/BundleSelectProvider';
import {
  recommendationDouble,
  resetRecommendationDouble,
} from '../../testing/recommendationDoubles';
import { RecommendViewer } from './RecommendViewer';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

// 재생·제스처 라이브러리는 모양과 제스처를 검증하지 않으므로 mock
vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: ReactNode }) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: { children: ReactNode }) => <div data-testid="slide">{children}</div>,
}));
vi.mock('swiper/modules', () => ({ A11y: {}, Keyboard: {}, Zoom: {} }));
vi.mock('swiper/css', () => ({}));
vi.mock('swiper/css/zoom', () => ({}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/features/photo-box/hooks/usePhotoBox', async () => ({
  usePhotoBox: (await import('../../testing/selectScreenDoubles')).usePhotoBoxDouble,
}));
vi.mock('../../hooks/useCreateBundle', async () => ({
  useCreateBundle: (await import('../../testing/selectScreenDoubles')).useCreateBundleDouble,
}));
vi.mock(
  '../../hooks/useRecommendations',
  async () => (await import('../../testing/recommendationDoubles')).recommendationHooksDouble,
);

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 앞 단계(멤버 선택)에서 멤버를 고른 상태로 시작
const renderViewer = (
  recommendationId: string | undefined,
  photoId: string | undefined,
  initialMemberIds: readonly string[] = ['gyeongjin'],
) =>
  render(
    <BundleSelectProvider initialMemberIds={initialMemberIds}>
      <RecommendViewer recommendationId={recommendationId} photoId={photoId} />
    </BundleSelectProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  resetRecommendationDouble();
});

describe('RecommendViewer', () => {
  it('헤더에 촬영 날짜를 보이고 추천 사진을 모두 슬라이드로 둔다', () => {
    renderViewer('rec-1', 'photo-1');

    expect(screen.getByRole('banner')).toHaveTextContent(/월 .+일/);
    expect(screen.getByRole('status')).toHaveTextContent('6장 중 1번째 사진');
    expect(screen.getAllByTestId('slide')).toHaveLength(6);
  });

  it('뷰어에는 정사각 썸네일이 아니라 원본 비율 사진을 보여 준다', () => {
    const detail = recommendationDouble.details['rec-1']!;
    const first = detail.photos[0]!;
    recommendationDouble.details = {
      ...recommendationDouble.details,
      'rec-1': { ...detail, originalSrcById: { [first.id]: '/original-1.jpg' } },
    };
    renderViewer('rec-1', first.id);

    const sources = screen.getAllByRole('img').map((image) => image.getAttribute('src'));
    expect(sources[0]).toBe('/original-1.jpg');
    // 원본 주소를 모르는 사진은 목록 사진 주소를 그대로 씀
    expect(sources[1]).toBe(detail.photos[1]?.src);
  });

  it('추천 사진을 불러오지 못하면 안내 토스트 뒤 사진 선택 화면으로 돌아간다', () => {
    recommendationDouble.failing = true;
    renderViewer('rec-1', 'photo-1');

    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.recommendationsFailed);
    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });

  it('저장·날짜 변경·삭제 메뉴(더보기)가 없다', () => {
    renderViewer('rec-1', 'photo-1');

    expect(screen.queryByRole('button', { name: '더보기' })).toBeNull();
  });

  it('뒤로 가기는 돌아갈 기록이 없으면 추천 상세로 이동한다', async () => {
    renderViewer('rec-1', 'photo-1');

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.recommendation('rec-1'));
  });

  it('멤버를 고르지 않고 들어오면 안내 없이 멤버 선택으로 보낸다', () => {
    renderViewer('rec-1', 'photo-999', []);

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.members);
    expect(router.replace).not.toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
    expect(toast).not.toHaveBeenCalled();
  });

  it('추천에 없는 사진이면 안내 토스트 뒤 사진 선택 화면으로 돌아간다', () => {
    renderViewer('rec-1', 'photo-999');

    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.deletedRecommendation);
    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });

  it('추천이 없으면 같은 안내로 처리한다', () => {
    renderViewer('nope', 'photo-1');

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });
});
