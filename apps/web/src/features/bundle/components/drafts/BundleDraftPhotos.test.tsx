import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { DraftProvider } from '../../contexts/DraftProvider';
import { BundleDraftPhotoCaption } from './BundleDraftPhotoCaption';
import { BundleDraftPhotoViewer } from './BundleDraftPhotoViewer';

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

const renderCaption = (photoId: string | undefined, draftId: string | undefined = 'draft-1') =>
  render(
    <DraftProvider draftId={draftId}>
      <BundleDraftPhotoCaption photoId={photoId} />
    </DraftProvider>,
  );

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

describe('BundleDraftPhotoCaption', () => {
  it('있는 사진이면 안내 없이 캡션 화면을 보여 준다', () => {
    renderCaption('draft-photo-2');

    expect(screen.getByRole('textbox', { name: '사진 캡션' })).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('없는 사진이면 「사진함에서 삭제된 사진이에요.」 뒤 작성 화면으로 이동(replace)한다', () => {
    renderCaption('no-such-photo');

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photoDeleted, { fullWidth: true });
    expect(replace).toHaveBeenCalledWith('/bunch/drafts/draft-1');
  });

  it('형식이 틀려 undefined로 넘어온 사진 id도 같은 안내로 처리한다', () => {
    renderCaption(undefined);

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photoDeleted, { fullWidth: true });
    expect(replace).toHaveBeenCalledWith('/bunch/drafts/draft-1');
  });

  it('사진을 누르면 그 사진의 크게 보기 주소로 이동(push)한다', async () => {
    renderCaption('draft-photo-1');

    await userEvent.click(screen.getByRole('button', { name: '3번째 사진 크게 보기' }));

    expect(push).toHaveBeenCalledWith('/bunch/drafts/draft-1/photos/draft-photo-3/viewer');
  });

  it('돌아갈 기록이 없으면 뒤로 가기는 작성 화면으로 이동(replace)한다', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    renderCaption('draft-photo-1');

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(replace).toHaveBeenCalledWith('/bunch/drafts/draft-1');
  });

  it('보던 사진을 빼도 화면에서 쫓겨나지 않는다(처음 한 번만 판단)', async () => {
    renderCaption('draft-photo-2');

    await userEvent.click(screen.getByRole('button', { name: '2번째 사진 빼기' }));
    await userEvent.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(screen.getAllByRole('img', { name: /한강에서 달리는 사람들/ })).toHaveLength(2);
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('캡션을 쓰면 상태에 바로 반영되고 이 흐름의 작성 화면과 같은 초안을 본다', async () => {
    renderCaption('draft-photo-2');

    await userEvent.type(screen.getByRole('textbox', { name: '사진 캡션' }), '새 캡션');

    expect(screen.getByRole('textbox', { name: '사진 캡션' })).toHaveValue('새 캡션');
  });
});

describe('BundleDraftPhotoViewer', () => {
  it('있는 사진이면 크게 보기를 보여 준다', () => {
    renderViewer('draft-photo-1');

    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('없는 사진이면 안내 뒤 작성 화면으로 이동(replace)한다', () => {
    renderViewer('no-such-photo');

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photoDeleted, { fullWidth: true });
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
    renderCaption('draft-photo-3');

    expect(screen.getByText('3장 중 3번째 사진')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('적어 둔 사진도 주소의 사진도 빠졌으면 첫 장으로 열고 쫓겨나지 않는다', () => {
    window.history.replaceState({ bundleDraftPhotoId: 'deleted-photo' }, '', '/');
    renderCaption('also-deleted');

    expect(screen.getByText('3장 중 1번째 사진')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('마지막 사진을 빼면 앞 사진이 보이고 그 캡션이 입력란에 나온다', async () => {
    renderCaption('draft-photo-3');
    await userEvent.type(screen.getByRole('textbox', { name: '사진 캡션' }), '셋째');
    await userEvent.click(screen.getByRole('button', { name: '3번째 사진 빼기' }));
    await userEvent.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(screen.getAllByRole('img', { name: /한강에서 달리는 사람들/ })).toHaveLength(2);
    expect(screen.getByText('사진을 뺐어요. 2장이 남았어요.')).toBeInTheDocument();
  });

  it('history 항목에 적어 둔 사진이 있으면 주소의 처음 사진 대신 그 사진으로 연다', () => {
    window.history.replaceState({ bundleDraftPhotoId: 'draft-photo-2' }, '', '/');
    renderCaption('draft-photo-1');

    expect(screen.getByText('3장 중 2번째 사진')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('형식이 틀린 값이 적혀 있으면 무시하고 주소의 사진으로 연다', () => {
    window.history.replaceState({ bundleDraftPhotoId: '../x' }, '', '/');
    renderCaption('draft-photo-3');

    expect(screen.getByText('3장 중 3번째 사진')).toBeInTheDocument();
  });
});
