import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { usePhotoBox } from './usePhotoBox';

const renderPhotoBox = (options?: Parameters<typeof usePhotoBox>[1]) =>
  renderHook(() => usePhotoBox(undefined, options), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  });

const readyData = (state: ReturnType<typeof usePhotoBox>['state']) => {
  if (state.kind !== 'ready') throw new Error(`state is ${state.kind}`);
  return state.data;
};

describe('usePhotoBox', () => {
  it('처음에는 로딩이고, 끝나면 번치·멤버·전체 사진을 합쳐 준비 상태가 된다', async () => {
    const { result } = renderPhotoBox();
    expect(result.current.state.kind).toBe('loading');

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    const data = readyData(result.current.state);
    expect(data.bunch).toMatchObject({ id: '1', name: '여행쥬아' });
    expect(data.members).toHaveLength(5);
    expect(data.photos).toHaveLength(13);
    expect(data.viewer).toEqual({ memberId: String(MOCK_MEMBER_IDS.me), isAdmin: false });
  });

  it('관리자 역할이면 viewer.isAdmin이 true다', async () => {
    mockDb.update((current) => ({
      ...current,
      memberships: current.memberships.map((membership) =>
        membership.memberId === MOCK_MEMBER_IDS.me
          ? { ...membership, role: 'CO_OWNER' }
          : membership,
      ),
    }));
    const { result } = renderPhotoBox();

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(readyData(result.current.state).viewer.isAdmin).toBe(true);
  });

  it('날짜를 모르는 사진도 같은 목록에 takenAt null로 들어온다', async () => {
    mockDb.update((current) => ({
      ...current,
      photos: current.photos.map((photo) =>
        photo.photoId === MOCK_PHOTO_IDS.O1
          ? { ...photo, capturedDate: null, capturedTime: null }
          : photo,
      ),
    }));
    const { result } = renderPhotoBox();

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    const photos = readyData(result.current.state).photos;
    expect(photos).toHaveLength(13);
    expect(photos.filter((photo) => photo.takenAt === null).map((photo) => photo.id)).toEqual([
      String(MOCK_PHOTO_IDS.O1),
    ]);
  });

  it('기본 번치가 없으면 번치 없음 상태다', async () => {
    mockDb.update((current) => ({ ...current, memberships: [] }));
    const { result } = renderPhotoBox();

    await waitFor(() => expect(result.current.state.kind).toBe('no-bunch'));
  });

  it('요청이 실패하면 오류 상태다', async () => {
    server.use(http.get('/api/bunches/:bunchId/photos', () => fail(500, 'COMMON_500')));
    const { result } = renderPhotoBox();

    await waitFor(() => expect(result.current.state.kind).toBe('error'));
  });

  it('삭제하면 서버 사진이 사라지고 목록을 다시 불러와 반영한다', async () => {
    const { result } = renderPhotoBox();
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));

    let removedCount = 0;
    await act(async () => {
      removedCount = (await result.current.actions.deletePhotos([String(MOCK_PHOTO_IDS.S4)]))
        .removedCount;
    });

    expect(removedCount).toBe(1);
    await waitFor(() => expect(readyData(result.current.state).photos).toHaveLength(12));
  });

  it('날짜를 바꾸면 서버에 반영하고 목록을 다시 받아 그 날짜로 옮겨 보인다', async () => {
    const { result } = renderPhotoBox();
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    const mine = String(MOCK_PHOTO_IDS.S4);

    await act(() => result.current.actions.changePhotoDates([mine], new Date(2026, 9, 20)));

    await waitFor(() => {
      const moved = readyData(result.current.state).photos.find((photo) => photo.id === mine);
      expect(moved?.takenAt?.startsWith('2026-10-20')).toBe(true);
    });
  });

  it('멤버 목록 응답이 비어도 준비 상태로 넘어간다', async () => {
    server.use(http.get('/api/bunches/:bunchId/members', () => ok([])));
    const { result } = renderPhotoBox();

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(readyData(result.current.state).viewer.isAdmin).toBe(false);
  });

  it('다시 시도하면 실패했던 요청만 다시 보내 준비 상태가 된다', async () => {
    let fail500 = true;
    server.use(
      http.get('/api/bunches/:bunchId/photos', () => {
        if (fail500) return fail(500, 'COMMON_500');
        return ok({ totalCount: 0, photos: [] });
      }),
    );
    const { result } = renderPhotoBox();
    await waitFor(() => expect(result.current.state.kind).toBe('error'));

    fail500 = false;
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
  });

  it('날짜 있는 목록과 없는 목록에 같은 사진이 있으면 한 번만 보인다', async () => {
    const row = {
      photoId: 1,
      thumbnailUrl: '/mock/photos/S1-thumb.jpg',
      uploaderIds: [1],
    };
    server.use(
      http.get('/api/bunches/:bunchId/photos', () =>
        ok({ totalCount: 1, photos: [{ ...row, capturedDate: '2026-10-18' }] }),
      ),
      http.get('/api/bunches/:bunchId/photos/undated', () => ok({ totalCount: 1, photos: [row] })),
    );
    const { result } = renderPhotoBox();

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    const photos = readyData(result.current.state).photos;
    expect(photos).toHaveLength(1);
    // 날짜 있는 쪽이 남음
    expect(photos[0]?.takenAt).toBe('2026-10-18T00:00');
  });

  it('목록이 여러 쪽이어도 마지막 쪽까지 모아 전체를 돌려준다', async () => {
    const photo = (photoId: number) => ({
      photoId,
      thumbnailUrl: `/mock/photos/${photoId}-thumb.jpg`,
      capturedDate: '2026-10-18',
      uploaderIds: [1],
    });
    server.use(
      http.get('/api/bunches/:bunchId/photos', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor === null) return ok({ totalCount: 3, photos: [photo(1)], nextCursor: 'p2' });
        if (cursor === 'p2') return ok({ totalCount: 3, photos: [photo(2)], nextCursor: 'p3' });
        return ok({ totalCount: 3, photos: [photo(3)] });
      }),
    );
    const { result } = renderPhotoBox();

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(
      readyData(result.current.state)
        .photos.map((p) => p.id)
        .sort(),
    ).toEqual(['1', '2', '3']);
  });

  it('cursor가 A→B→A로 순환해도 무한 반복하지 않고 받은 사진은 남긴다', async () => {
    let calls = 0;
    const photo = (photoId: number) => ({
      photoId,
      thumbnailUrl: '/mock/photos/S1-thumb.jpg',
      capturedDate: '2026-10-18',
      uploaderIds: [1],
    });
    server.use(
      http.get('/api/bunches/:bunchId/photos', ({ request }) => {
        calls += 1;
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor === null) return ok({ totalCount: 3, photos: [photo(1)], nextCursor: 'A' });
        if (cursor === 'A') return ok({ totalCount: 3, photos: [photo(2)], nextCursor: 'B' });
        return ok({ totalCount: 3, photos: [photo(3)], nextCursor: 'A' });
      }),
    );
    const { result } = renderPhotoBox();

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(calls).toBe(3);
    expect(readyData(result.current.state).photos).toHaveLength(3);
  });

  it('이미 받은 목록이 있으면 삭제 뒤 재조회가 실패해도 오류 화면으로 덮지 않는다', async () => {
    const { result } = renderPhotoBox();
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));

    server.use(http.get('/api/bunches/:bunchId/photos', () => fail(500, 'COMMON_500')));
    await act(async () => {
      await result.current.actions.deletePhotos([String(MOCK_PHOTO_IDS.S4)]);
    });

    expect(result.current.state.kind).toBe('ready');
    // 최신 목록을 받지 못했다는 사실은 화면이 안내하도록 알림
    await waitFor(() => expect(result.current.stale).toBe(true));
  });
});

describe('usePhotoBox 이어서 불러오기', () => {
  const photo = (photoId: number) => ({
    photoId,
    thumbnailUrl: `/mock/photos/${photoId}-thumb.jpg`,
    capturedDate: '2026-10-18',
    uploaderIds: [1],
  });
  // 둘째 쪽 응답을 테스트가 풀어 줄 때까지 붙잡아 첫 쪽만 온 상태를 관찰함
  const holdSecondPage = (secondPage: () => Response | Promise<Response>) => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get('/api/bunches/:bunchId/photos', async ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor === null) return ok({ totalCount: 2, photos: [photo(1)], nextCursor: 'p2' });
        await gate;
        return secondPage();
      }),
    );
    return release;
  };

  it('이어서 받는 화면은 첫 쪽이 오면 먼저 보여 주고, 나머지를 다 받으면 more가 없어진다', async () => {
    const release = holdSecondPage(() => ok({ totalCount: 2, photos: [photo(2)] }));
    const { result } = renderPhotoBox({ progressive: true });

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(readyData(result.current.state).photos.map((p) => p.id)).toEqual(['1']);
    expect(readyData(result.current.state).more).toBe('loading');

    release();
    await waitFor(() => expect(readyData(result.current.state).photos).toHaveLength(2));
    expect(readyData(result.current.state).more).toBeUndefined();
  });

  it('이어서 받는 화면은 나중 쪽이 실패해도 받은 사진을 유지하고, 다시 시도하면 이어 받는다', async () => {
    let failing = true;
    const release = holdSecondPage(() =>
      failing ? fail(500, 'COMMON_500') : ok({ totalCount: 2, photos: [photo(2)] }),
    );
    const { result } = renderPhotoBox({ progressive: true });
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));

    release();
    await waitFor(() => expect(readyData(result.current.state).more).toBe('error'));
    expect(readyData(result.current.state).photos).toHaveLength(1);
    // 이어 받다 실패한 것은 목록 재조회 실패 안내가 아니라 화면 아래 표시로 알림
    expect(result.current.stale).toBe(false);

    failing = false;
    act(() => result.current.loadMore());
    await waitFor(() => expect(readyData(result.current.state).photos).toHaveLength(2));
    expect(readyData(result.current.state).more).toBeUndefined();
  });

  it('재시도하는 동안은 more가 loading이고, 받는 중에 또 눌러도 요청은 한 번이며, 다시 실패하면 error로 돌아온다', async () => {
    // 둘째 쪽 요청마다 테스트가 풀어 줄 때까지 붙잡고 계속 실패시킴
    const pending: (() => void)[] = [];
    server.use(
      http.get('/api/bunches/:bunchId/photos', async ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor === null) return ok({ totalCount: 2, photos: [photo(1)], nextCursor: 'p2' });
        await new Promise<void>((resolve) => pending.push(resolve));
        return fail(500, 'COMMON_500');
      }),
    );
    const { result } = renderPhotoBox({ progressive: true });
    await waitFor(() => expect(pending).toHaveLength(1));

    pending[0]?.();
    await waitFor(() => expect(readyData(result.current.state).more).toBe('error'));

    act(() => result.current.loadMore());
    await waitFor(() => expect(pending).toHaveLength(2));
    // 재시도 중에는 실패 표시가 아니라 로딩
    expect(readyData(result.current.state).more).toBe('loading');
    act(() => result.current.loadMore());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(pending).toHaveLength(2);

    pending[1]?.();
    await waitFor(() => expect(readyData(result.current.state).more).toBe('error'));
    expect(pending).toHaveLength(2);
  });

  it('이어서 받지 않는 화면(번들)은 마지막 쪽까지 받기 전에는 준비 상태가 되지 않는다', async () => {
    const release = holdSecondPage(() => ok({ totalCount: 2, photos: [photo(2)] }));
    const { result } = renderPhotoBox();

    // 첫 쪽이 도착할 시간을 주어도 둘째 쪽이 올 때까지 로딩
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(result.current.state.kind).toBe('loading');

    release();
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    expect(readyData(result.current.state).photos).toHaveLength(2);
    expect(readyData(result.current.state).more).toBeUndefined();
  });

  it('이어서 받지 않는 화면은 나중 쪽이 실패하면 오류 상태가 된다', async () => {
    const release = holdSecondPage(() => fail(500, 'COMMON_500'));
    const { result } = renderPhotoBox();

    release();
    await waitFor(() => expect(result.current.state.kind).toBe('error'));
  });
});
