import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { usePhotoBox } from './usePhotoBox';

const renderPhotoBox = () =>
  renderHook(() => usePhotoBox(), { wrapper: createQueryWrapper(createTestQueryClient()) });

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

  it('날짜를 바꾸면 이 세션 목록에서 그 날짜로 옮겨 보인다(서버 반영 전)', async () => {
    const { result } = renderPhotoBox();
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));

    await act(() =>
      result.current.actions.changePhotoDates([String(MOCK_PHOTO_IDS.O1)], new Date(2026, 9, 20)),
    );

    const moved = readyData(result.current.state).photos.find(
      (photo) => photo.id === String(MOCK_PHOTO_IDS.O1),
    );
    expect(moved?.takenAt).toBe('2026-10-20T10:00');
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

  it('이미 받은 목록이 있으면 삭제 뒤 재조회가 실패해도 오류 화면으로 덮지 않는다', async () => {
    const { result } = renderPhotoBox();
    await waitFor(() => expect(result.current.state.kind).toBe('ready'));

    server.use(http.get('/api/bunches/:bunchId/photos', () => fail(500, 'COMMON_500')));
    await act(async () => {
      await result.current.actions.deletePhotos([String(MOCK_PHOTO_IDS.S4)]);
    });

    expect(result.current.state.kind).toBe('ready');
  });
});
