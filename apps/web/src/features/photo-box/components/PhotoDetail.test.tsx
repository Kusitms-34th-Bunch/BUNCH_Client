import type * as DesignSystem from '@app/design-system';
import type { ComponentProps } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhotoDetailScreen } from './PhotoDetailScreen';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { PHOTO_BOX_PATHS } from '../constants/paths';
import { photoBoxFixture } from '../fixtures/photoBox.fixture';
import { PhotoDetail } from './PhotoDetail';

const replace = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, back, push: vi.fn() }) }));

type ScreenProps = ComponentProps<typeof PhotoDetailScreen>;
let screenProps: ScreenProps | undefined;
// 화면(스와이프 포함)은 따로 검증하므로 받은 props만 붙잡음
vi.mock('./PhotoDetailScreen', () => ({
  PhotoDetailScreen: (props: ScreenProps) => {
    screenProps = props;
    return <div data-testid="detail-screen" />;
  },
}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span /> }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const firstId = photoBoxFixture.photos.find((photo) => photo.takenAt !== null)?.id ?? '';

beforeEach(() => {
  screenProps = undefined;
  vi.clearAllMocks();
});

describe('PhotoDetail', () => {
  it('있는 사진이면 사진함 순서의 사진과 멤버를 화면에 넘긴다', () => {
    const { getByTestId } = render(<PhotoDetail photoId={firstId} />);

    expect(getByTestId('detail-screen')).toBeTruthy();
    expect(screenProps?.initialPhotoId).toBe(firstId);
    expect(screenProps?.photos).toHaveLength(photoBoxFixture.photos.length);
    expect(screenProps?.members).toBe(photoBoxFixture.members);
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('없는 사진이면 「삭제된 사진이에요」 토스트 뒤 사진함으로 이동한다', () => {
    render(<PhotoDetail photoId="photo-9999" />);

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
    expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list);
    expect(screenProps).toBeUndefined();
  });

  it('형식이 틀린 id(undefined)도 같은 안내와 이동으로 처리한다', () => {
    render(<PhotoDetail photoId={undefined} />);

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
    expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list);
  });

  it('사진이 사라지게 삭제하면 사진함으로 이동한다', () => {
    render(<PhotoDetail photoId={firstId} />);

    screenProps?.onLeave();

    expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list);
  });

  it('화면에서 사진을 삭제해 목록에서 사라져도 「삭제된 사진이에요」 안내와 이동을 따로 하지 않는다', async () => {
    render(<PhotoDetail photoId={firstId} />);

    let removedCount = 0;
    await act(async () => {
      removedCount = (await screenProps?.actions.deletePhotos([firstId]))?.removedCount ?? 0;
    });

    expect(removedCount).toBeGreaterThan(0);
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('뒤로가기는 돌아갈 기록이 있으면 back, 직접 열었으면 사진함으로 이동한다', () => {
    render(<PhotoDetail photoId={firstId} />);

    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    screenProps?.onBack();
    expect(back).toHaveBeenCalledTimes(1);

    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    screenProps?.onBack();
    expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list);
    vi.restoreAllMocks();
  });

  it('사진을 넘기면 Next 이동 없이 주소만 현재 사진으로 바꾼다', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    render(<PhotoDetail photoId={firstId} />);

    screenProps?.onPhotoChange?.('photo-7');

    expect(replaceState).toHaveBeenCalledWith(null, '', PHOTO_BOX_PATHS.detail('photo-7'));
    expect(replace).not.toHaveBeenCalled();
    replaceState.mockRestore();
  });
});
