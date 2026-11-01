import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { BundleSelectProvider } from '../contexts/BundleSelectProvider';
import { RecommendViewer } from './RecommendViewer';

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

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const renderViewer = (recommendationId: string | undefined, photoId: string | undefined) =>
  render(
    <BundleSelectProvider>
      <RecommendViewer recommendationId={recommendationId} photoId={photoId} />
    </BundleSelectProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RecommendViewer', () => {
  it('헤더에 촬영 날짜를 보이고 추천 사진을 모두 슬라이드로 둔다', () => {
    renderViewer('rec-1', 'photo-1');

    expect(screen.getByRole('banner')).toHaveTextContent(/월 .+일/);
    expect(screen.getByRole('status')).toHaveTextContent('6장 중 1번째 사진');
    expect(screen.getAllByTestId('slide')).toHaveLength(6);
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

  it('추천에 없는 사진이면 안내 토스트 뒤 사진 선택 화면으로 돌아간다', () => {
    renderViewer('rec-1', 'photo-999');

    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.deletedRecommendation, {
      fullWidth: true,
    });
    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });

  it('추천이 없으면 같은 안내로 처리한다', () => {
    renderViewer('nope', 'photo-1');

    expect(router.replace).toHaveBeenCalledWith(BUNDLE_SELECT_PATHS.select);
  });
});
