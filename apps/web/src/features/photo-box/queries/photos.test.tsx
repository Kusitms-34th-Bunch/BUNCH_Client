import type * as DesignSystem from '@app/design-system';
import { onlineManager, useInfiniteQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { MissingPhotosError } from '../lib/missingPhotos';
import { photoBoxKeys } from './keys';
import { datedPhotosQueryOptions } from './photoLists';
import { useChangePhotoDatesMutation, useDeletePhotosMutation } from './photos';

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

    // 무효화는 mutateAsync를 기다리게 하지 않지만 끝날 때 바로 표시됨
    await act(() => result.current.mutateAsync([String(MOCK_PHOTO_IDS.S4)]));

    expect(isInvalidated(keys.photos)).toBe(true);
    expect(isInvalidated(keys.otherBunchPhotos)).toBe(false);
    expect(isInvalidated(keys.members)).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });

  it('성공하면 서버가 작성 중인 번들에서도 사진을 빼므로 번들 상세와 번치 홈의 작성 중인 번들도 무효화한다', async () => {
    const client = createTestQueryClient();
    const draftKey = sharedKeys.draftBundles(bunchId);
    const detailKey = [...sharedKeys.bundleDetailsOf(bunchId), '5'] as const;
    client.setQueryData(draftKey, []);
    client.setQueryData(detailKey, {});
    const { result } = renderHook(() => useDeletePhotosMutation(bunchId), {
      wrapper: createQueryWrapper(client),
    });

    await act(() => result.current.mutateAsync([String(MOCK_PHOTO_IDS.S4)]));

    expect(client.getQueryState(draftKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(detailKey)?.isInvalidated).toBe(true);
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

  const pagesOf = (...ids: string[]) => ({
    pageParams: [undefined],
    pages: [{ photos: ids.map((id) => ({ id })), nextCursor: null }],
  });
  const idsIn = (data: unknown) =>
    (data as ReturnType<typeof pagesOf>).pages.flatMap((page) => page.photos.map((p) => p.id));

  it('응답을 기다리지 않고 누르는 즉시 날짜별·날짜 없음 목록에서 고른 사진을 뺀다', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post('/api/bunches/:bunchId/photos/delete', async () => {
        await gate;
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(photoBoxKeys.datedPhotos(bunchId), pagesOf('1', '2'));
    client.setQueryData(photoBoxKeys.undatedPhotos(bunchId), pagesOf('3'));
    const { result } = renderHook(() => useDeletePhotosMutation(bunchId), {
      wrapper: createQueryWrapper(client),
    });

    act(() => result.current.mutate(['1', '3']));

    await waitFor(() =>
      expect(idsIn(client.getQueryData(photoBoxKeys.datedPhotos(bunchId)))).toEqual(['2']),
    );
    expect(idsIn(client.getQueryData(photoBoxKeys.undatedPhotos(bunchId)))).toEqual([]);
    release();
  });

  it('실패하면 뺀 사진을 되돌리고 토스트 없이 목록을 서버 기준으로 다시 받는다(안내는 화면 몫)', async () => {
    server.use(http.post('/api/bunches/:bunchId/photos/delete', () => fail(500, 'COMMON_500')));
    const client = createTestQueryClient();
    client.setQueryData(photoBoxKeys.datedPhotos(bunchId), pagesOf('1', '2'));
    const { result } = renderHook(() => useDeletePhotosMutation(bunchId), {
      wrapper: createQueryWrapper(client),
    });

    act(() => result.current.mutate(['1']));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'COMMON_500' });
    expect(idsIn(client.getQueryData(photoBoxKeys.datedPhotos(bunchId)))).toEqual(['1', '2']);
    expect(client.getQueryState(photoBoxKeys.datedPhotos(bunchId))?.isInvalidated).toBe(true);
    expect(toast).not.toHaveBeenCalled();
  });

  it('성공하면 지운 사진의 상세 캐시를 지운다(다시 받으면 404)', async () => {
    const client = createTestQueryClient();
    const photoId = String(MOCK_PHOTO_IDS.S4);
    client.setQueryData(photoBoxKeys.photoDetail(bunchId, photoId), { id: photoId });
    const { result } = renderHook(() => useDeletePhotosMutation(bunchId), {
      wrapper: createQueryWrapper(client),
    });

    await act(() => result.current.mutateAsync([photoId]));

    expect(client.getQueryData(photoBoxKeys.photoDetail(bunchId, photoId))).toBeUndefined();
  });

  it('고른 사진이 그사이 지워져 거절되면 사라진 사진이 빠지도록 목록을 다시 받는다', async () => {
    const { client, keys, isInvalidated } = createSeededClient();
    const { result } = renderHook(() => useDeletePhotosMutation(bunchId), {
      wrapper: createQueryWrapper(client),
    });

    act(() => result.current.mutate(['999']));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(MissingPhotosError);
    expect(isInvalidated(keys.photos)).toBe(true);
    expect(isInvalidated(keys.otherBunchPhotos)).toBe(false);
  });
});

describe('useChangePhotoDatesMutation', () => {
  beforeEach(() => toast.mockClear());

  it('성공하면 이 번치의 사진 목록만 무효화한다', async () => {
    const { client, keys, isInvalidated } = createSeededClient();
    const { result } = renderHook(() => useChangePhotoDatesMutation(bunchId), {
      wrapper: createQueryWrapper(client),
    });

    await act(() =>
      result.current.mutateAsync({
        photoIds: [String(MOCK_PHOTO_IDS.S4)],
        date: new Date(2026, 9, 5),
      }),
    );

    expect(isInvalidated(keys.photos)).toBe(true);
    expect(isInvalidated(keys.otherBunchPhotos)).toBe(false);
    expect(isInvalidated(keys.members)).toBe(false);
  });

  it('고른 사진이 그사이 지워져 거절되면 목록을 다시 받고, 그 밖의 실패는 캐시를 그대로 둔다', async () => {
    const missing = createSeededClient();
    const first = renderHook(() => useChangePhotoDatesMutation(bunchId), {
      wrapper: createQueryWrapper(missing.client),
    });
    act(() => first.result.current.mutate({ photoIds: ['999'], date: new Date(2026, 9, 5) }));
    await waitFor(() => expect(first.result.current.isError).toBe(true));
    expect(first.result.current.error).toBeInstanceOf(MissingPhotosError);
    expect(missing.isInvalidated(missing.keys.photos)).toBe(true);

    server.use(http.post('/api/bunches/:bunchId/photos/date', () => fail(500, 'COMMON_500')));
    const other = createSeededClient();
    const second = renderHook(() => useChangePhotoDatesMutation(bunchId), {
      wrapper: createQueryWrapper(other.client),
    });
    act(() =>
      second.result.current.mutate({
        photoIds: [String(MOCK_PHOTO_IDS.S4)],
        date: new Date(2026, 9, 5),
      }),
    );
    await waitFor(() => expect(second.result.current.isError).toBe(true));
    expect(other.isInvalidated(other.keys.photos)).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('연결이 끊긴 상태의 삭제·날짜 바꾸기', () => {
  beforeEach(() => onlineManager.setOnline(false));
  afterEach(() => onlineManager.setOnline(true));

  // 보류되면 응답이 없어 화면 전체 로딩이 계속 떠 있으므로, 끊겨 있어도 바로 보내 실패로 끝나야 함
  it('삭제 요청은 보류되지 않고 바로 실패한다', async () => {
    server.use(http.post('/api/bunches/:bunchId/photos/delete', () => fail(500, 'COMMON_500')));
    const { result } = renderHook(() => useDeletePhotosMutation(bunchId), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    act(() => result.current.mutate(['1']));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPaused).toBe(false);
  });

  it('날짜 변경 요청은 보류되지 않고 바로 실패한다', async () => {
    server.use(http.post('/api/bunches/:bunchId/photos/date', () => fail(500, 'COMMON_500')));
    const { result } = renderHook(() => useChangePhotoDatesMutation(bunchId), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    act(() => result.current.mutate({ photoIds: ['1'], date: new Date(2026, 9, 5) }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPaused).toBe(false);
  });
});
