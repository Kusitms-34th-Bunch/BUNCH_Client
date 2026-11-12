import type * as DesignSystem from '@app/design-system';
import { useInfiniteQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { photoBoxKeys } from './keys';
import { datedPhotosQueryOptions } from './photoLists';
import { useDeletePhotosMutation } from './photos';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
// 토스트 표시는 DS의 `toast()` 담당이라 호출 인자만 확인
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const bunchId = String(MOCK_BUNCH_ID);

// 무효화 확인용으로 캐시에 값을 미리 넣어 둔 client
const createSeededClient = () => {
  const client = createTestQueryClient();
  const keys = {
    photos: [...photoBoxKeys.photos(bunchId), 'dated'],
    otherBunchPhotos: photoBoxKeys.photos('2'),
    members: sharedKeys.bunchMembers(bunchId),
  };
  Object.values(keys).forEach((key) => client.setQueryData(key, []));
  const isInvalidated = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;
  return { client, keys, isInvalidated };
};

describe('useDeletePhotosMutation', () => {
  beforeEach(() => toast.mockClear());

  it('성공하면 이 번치의 사진 목록만 무효화한다', async () => {
    const { client, keys, isInvalidated } = createSeededClient();
    const { result } = renderHook(() => useDeletePhotosMutation(bunchId), {
      wrapper: createQueryWrapper(client),
    });

    // onSuccess가 무효화를 반환하므로 mutateAsync가 끝나면 캐시 상태가 확정됨
    await act(() => result.current.mutateAsync([String(MOCK_PHOTO_IDS.S4)]));

    expect(isInvalidated(keys.photos)).toBe(true);
    expect(isInvalidated(keys.otherBunchPhotos)).toBe(false);
    expect(isInvalidated(keys.members)).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });

  it('쪽 단위로 받은 목록도 삭제 뒤 받았던 쪽을 처음부터 다시 받는다', async () => {
    const client = createTestQueryClient();
    const wrapper = createQueryWrapper(client);
    const list = renderHook(
      () => {
        const query = useInfiniteQuery(datedPhotosQueryOptions(bunchId));
        // 둘째 쪽 이후는 이 테스트의 관심 밖이라 첫 쪽만 받고 멈춤
        return query;
      },
      { wrapper },
    );
    await waitFor(() => expect(list.result.current.data).toBeDefined());
    const before = list.result.current.dataUpdatedAt;
    const { result } = renderHook(() => useDeletePhotosMutation(bunchId), { wrapper });

    await act(() => result.current.mutateAsync([String(MOCK_PHOTO_IDS.S4)]));

    // 활성 목록이 다시 받아져 삭제한 사진이 빠진 새 데이터가 됨
    await waitFor(() => expect(list.result.current.dataUpdatedAt).toBeGreaterThan(before));
    expect(list.result.current.data?.map((photo) => photo.id)).not.toContain(
      String(MOCK_PHOTO_IDS.S4),
    );
  });

  it('실패하면 공통 처리가 삭제 실패 토스트를 띄우고 캐시는 그대로 둔다', async () => {
    server.use(http.post('/api/bunches/:bunchId/photos/delete', () => fail(500, 'COMMON_500')));
    const { client, keys, isInvalidated } = createSeededClient();
    const { result } = renderHook(() => useDeletePhotosMutation(bunchId), {
      wrapper: createQueryWrapper(client),
    });

    act(() => result.current.mutate(['1']));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'COMMON_500' });
    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deleteFailed);
    expect(isInvalidated(keys.photos)).toBe(false);
  });
});
