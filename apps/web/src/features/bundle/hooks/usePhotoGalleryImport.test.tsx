import type * as DesignSystem from '@app/design-system';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PHOTO_BOX_MESSAGES } from '@/features/photo-box/constants/messages';
import { MAX_PHOTOS_IN_BOX } from '@/features/photo-box/lib/photoActions';
import { usePhotoGalleryImport } from './usePhotoGalleryImport';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => vi.clearAllMocks());

describe('usePhotoGalleryImport', () => {
  it('사진함이 가득 차면 「사진함이 가득 찼어요.」만 띄운다', () => {
    const { result } = renderHook(() => usePhotoGalleryImport(MAX_PHOTOS_IN_BOX));

    result.current(10);

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.photoBoxFull);
  });

  it('가득 차지 않았으면 안내를 띄우지 않는다', () => {
    const { result } = renderHook(() => usePhotoGalleryImport(MAX_PHOTOS_IN_BOX - 1));

    result.current(10);

    expect(toast).not.toHaveBeenCalled();
  });
});
