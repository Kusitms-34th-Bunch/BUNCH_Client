import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { DraftProvider } from '../../contexts/DraftProvider';
import { BundleDraftPhotoViewer } from './BundleDraftPhotoViewer';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('swiper/modules', () => ({ A11y: {}, Keyboard: {}, Zoom: {} }));
vi.mock('swiper/css', () => ({}));
vi.mock('swiper/css/zoom', () => ({}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 초안 화면 동작은 샘플 초안 대역으로 확인하고, 서버 연동은 useDraft 테스트가 가짜 서버로 확인
vi.mock('@/features/photo-box/hooks/usePhotoBox', async () => ({
  usePhotoBox: (await import('../../testing/selectScreenDoubles')).usePhotoBoxDouble,
}));
vi.mock('../../hooks/useDraft', async () => ({
  useDraft: (await import('../../testing/useDraftFixture')).useDraftFixture,
}));

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));

const renderViewer = (photoId: string | undefined) =>
  render(
    <DraftProvider draftId="draft-1">
      <BundleDraftPhotoViewer photoId={photoId} />
    </DraftProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  // 보던 사진 id를 history 항목에 적어 두므로 시험 사이에 남지 않게 비움
  window.history.replaceState(null, '', '/');
});

describe('BundleDraftPhotoViewer', () => {
  it('있는 사진이면 크게 보기를 보여 준다', () => {
    renderViewer('draft-photo-1');

    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('없는 사진이면 안내 뒤 작성 화면으로 이동(replace)한다', () => {
    renderViewer('no-such-photo');

    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_MESSAGES.photoDeleted);
    expect(replace).toHaveBeenCalledWith('/bunch/drafts/draft-1');
  });

  it('돌아갈 기록이 없으면 뒤로 가기는 작성 화면으로 이동(replace)한다', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    renderViewer('draft-photo-2');

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(replace).toHaveBeenCalledWith('/bunch/drafts/draft-1');
  });
});

describe('보던 사진 유지', () => {
  it('적어 둔 사진이 초안에서 빠졌으면 쫓겨나지 않고 주소의 사진으로 연다(크게 보기에서 삭제하고 돌아온 경우)', () => {
    window.history.replaceState({ bundleDraftPhotoId: 'deleted-photo' }, '', '/');
    renderViewer('draft-photo-3');

    expect(screen.getByText('3장 중 3번째 사진')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('적어 둔 사진도 주소의 사진도 빠졌으면 첫 장으로 열고 쫓겨나지 않는다', () => {
    window.history.replaceState({ bundleDraftPhotoId: 'deleted-photo' }, '', '/');
    renderViewer('also-deleted');

    expect(screen.getByText('3장 중 1번째 사진')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('history 항목에 적어 둔 사진이 있으면 주소의 처음 사진 대신 그 사진으로 연다', () => {
    window.history.replaceState({ bundleDraftPhotoId: 'draft-photo-2' }, '', '/');
    renderViewer('draft-photo-1');

    expect(screen.getByText('3장 중 2번째 사진')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('형식이 틀린 값이 적혀 있으면 무시하고 주소의 사진으로 연다', () => {
    window.history.replaceState({ bundleDraftPhotoId: '../x' }, '', '/');
    renderViewer('draft-photo-3');

    expect(screen.getByText('3장 중 3번째 사진')).toBeInTheDocument();
  });
});
