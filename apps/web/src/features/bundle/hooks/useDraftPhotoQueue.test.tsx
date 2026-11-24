import type * as DesignSystem from '@app/design-system';
import { ApiError } from '@app/api-core';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftPhoto } from '../lib/types';
import type { BundleDetail } from '../model/bundle';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { useDraftPhotoQueue } from './useDraftPhotoQueue';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast,
}));

const shown = (id: string): DraftPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  takenAt: null,
  uploaderId: 'me',
});
const detailWith = (...ids: string[]) =>
  ({ revision: 1, status: 'DRAFT', photos: ids.map((id) => ({ id })) }) as unknown as BundleDetail;

const setup = (overrides: { offline?: boolean } = {}) => {
  const store = { detail: detailWith('1', '2', '3') };
  const changePhotos = vi.fn((_input: { removeBundlePhotoIds: readonly string[] }) =>
    Promise.resolve(detailWith('2', '3')),
  );
  const hook = renderHook(() =>
    useDraftPhotoQueue({
      readDetail: () => store.detail,
      writeDetail: (next) => {
        store.detail = next;
      },
      isOffline: () => overrides.offline === true,
      refetchDetail: vi.fn(),
      changePhotos,
      movePhoto: vi.fn(() => Promise.resolve(store.detail)),
    }),
  );
  // 렌더된 사진 목록을 연속 조작의 기준으로 맞춤(useDraft의 effect와 같은 역할)
  act(() => hook.result.current.syncShown([shown('1'), shown('2'), shown('3')]));
  return { ...hook, store, changePhotos };
};

beforeEach(() => toast.mockClear());

describe('useDraftPhotoQueue', () => {
  it('뺀 사진을 바로 화면에서 빼고 서버에 보낸 뒤, 끝나면 화면 값을 버리고 서버 값을 따른다', async () => {
    const { result, store, changePhotos } = setup();

    act(() => result.current.actions.removePhoto('1'));
    expect(result.current.localPhotos?.map((photo) => photo.id)).toEqual(['2', '3']);
    expect(result.current.busy).toBe(true);
    expect(result.current.holdsEvents()).toBe(true);

    let outcome: { failed: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.settled();
    });

    expect(changePhotos.mock.calls[0]?.[0].removeBundlePhotoIds).toEqual(['1']);
    expect(store.detail.photos.map((photo) => photo.id)).toEqual(['2', '3']);
    expect(outcome).toEqual({ failed: false });
    expect(result.current.localPhotos).toBeUndefined();
    expect(result.current.busy).toBe(false);
    expect(result.current.holdsEvents()).toBe(false);
  });

  it('실패하면 한 번만 안내하고 화면 값을 버려 서버 값으로 되돌리며 실패로 알린다', async () => {
    const { result, changePhotos } = setup();
    changePhotos.mockRejectedValue(new ApiError({ message: 'x', category: 'server', status: 500 }));

    act(() => result.current.actions.removePhoto('1'));
    act(() => result.current.actions.removePhoto('2'));
    let outcome: { failed: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.settled();
    });

    // 첫 실패 뒤 남은 변경은 건너뜀
    expect(changePhotos).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photosChangeFailed);
    expect(outcome).toEqual({ failed: true });
    expect(result.current.localPhotos).toBeUndefined();
  });

  it('끊겨 있으면 보내지 않고 건너뛴 변경으로 셈한다(발행 전 확인이 알아챔)', async () => {
    const { result, changePhotos } = setup({ offline: true });

    act(() => result.current.actions.removePhoto('1'));
    let outcome: { failed: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.settled();
    });

    expect(changePhotos).not.toHaveBeenCalled();
    expect(outcome).toEqual({ failed: true });
    expect(toast).not.toHaveBeenCalled();
  });
});
