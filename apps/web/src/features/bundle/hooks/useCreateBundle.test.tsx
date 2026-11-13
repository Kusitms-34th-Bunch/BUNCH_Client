import type * as DesignSystem from '@app/design-system';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { mockDrafts } from '@/mocks/db/drafts';
import { MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNDLE_SELECT_MESSAGES } from '../constants/selectMessages';
import { useCreateBundle } from './useCreateBundle';

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const photoIds = [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5)];
const participants = [String(MOCK_MEMBER_IDS.memberA)];

const renderCreate = () =>
  renderHook(() => useCreateBundle(), { wrapper: createQueryWrapper(createTestQueryClient()) });

// 번치 정보(내 프로필·멤버)를 받은 뒤 호출해야 오류 안내를 정확히 고름
const loaded = async (result: ReturnType<typeof renderCreate>['result']) => {
  await waitFor(() => expect(result.current.creating).toBe(false));
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCreateBundle', () => {
  it('초안을 만들면 작성 화면으로 이동하고 이동이 끝날 때까지 생성 중으로 둔다', async () => {
    const { result } = renderCreate();
    await loaded(result);

    act(() => result.current.create(photoIds, participants));

    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
    const [bundle] = mockDrafts();
    expect(router.push).toHaveBeenCalledWith(`/bunch/drafts/${bundle?.id}`);
    expect(bundle?.photos.map((photo) => photo.photoId)).toEqual([
      MOCK_PHOTO_IDS.S4,
      MOCK_PHOTO_IDS.S5,
    ]);
    expect(result.current.creating).toBe(true);
  });

  it('생성 중이거나 만든 뒤에 다시 눌러도 요청하지 않는다', async () => {
    const { result } = renderCreate();
    await loaded(result);

    act(() => {
      result.current.create(photoIds, participants);
      result.current.create(photoIds, participants);
    });
    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
    act(() => result.current.create(photoIds, participants));

    expect(mockDrafts()).toHaveLength(1);
  });

  it('고른 사진이 없으면 요청하지 않는다', async () => {
    const { result } = renderCreate();
    await loaded(result);

    act(() => result.current.create([], participants));

    expect(mockDrafts()).toHaveLength(0);
    expect(result.current.creating).toBe(false);
  });

  it('번치 멤버가 1명뿐이면 멤버 초대 안내를 띄우고 이동하지 않는다', async () => {
    mockDb.update((current) => ({
      ...current,
      memberships: current.memberships.filter((membership) => membership.memberId === 5),
    }));
    const { result } = renderCreate();
    await loaded(result);

    act(() => result.current.create(photoIds, participants));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.membersRequired));
    expect(router.push).not.toHaveBeenCalled();
    expect(result.current.creating).toBe(false);
  });

  it('초안이 10개면 한도 안내를 띄운다', async () => {
    const { result } = renderCreate();
    await loaded(result);
    server.use(http.post('/api/bunches/:bunchId/bundles', () => fail(409, 'BUNDLE_001')));

    act(() => result.current.create(photoIds, participants));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.draftLimit));
  });

  it('그 밖의 실패는 일반 안내를 띄우고 다시 시도할 수 있다', async () => {
    const { result } = renderCreate();
    await loaded(result);
    server.use(http.post('/api/bunches/:bunchId/bundles', () => fail(500, 'COMMON_500')));

    act(() => result.current.create(photoIds, participants));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.createFailed));
    expect(result.current.creating).toBe(false);
  });

  it('네트워크 오류 뒤 같은 사진으로 다시 만들면 같은 멱등 키로 보내고, 서버가 거절한 뒤에는 새 키를 쓴다', async () => {
    const { result } = renderCreate();
    await loaded(result);
    const keys: (string | null)[] = [];
    let attempt = 0;
    server.use(
      http.post('/api/bunches/:bunchId/bundles', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        attempt += 1;
        if (attempt === 1) return HttpResponse.error();
        if (attempt === 2) return fail(409, 'BUNDLE_001');
        return undefined;
      }),
    );

    act(() => result.current.create(photoIds, participants));
    await waitFor(() => expect(keys).toHaveLength(1));
    await waitFor(() => expect(result.current.creating).toBe(false));
    act(() => result.current.create(photoIds, participants));
    await waitFor(() => expect(keys).toHaveLength(2));
    await waitFor(() => expect(result.current.creating).toBe(false));
    act(() => result.current.create(photoIds, participants));
    await waitFor(() => expect(keys).toHaveLength(3));

    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('고른 참여 멤버를 요청에 담아 보내고, 참여 멤버가 없으면 요청하지 않는다', async () => {
    const { result } = renderCreate();
    await loaded(result);

    act(() => result.current.create(photoIds, []));
    expect(mockDrafts()).toHaveLength(0);
    expect(result.current.creating).toBe(false);

    act(() => result.current.create(photoIds, participants));
    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
    const [bundle] = mockDrafts();
    // 참여자는 생성자와 고른 멤버뿐(사진을 올린 멤버라도 고르지 않으면 참여하지 않음)
    expect(bundle?.participants.map((p) => p.memberId)).toEqual([
      MOCK_MY_MEMBER_ID,
      MOCK_MEMBER_IDS.memberA,
    ]);
  });

  it('사진이 사라졌으면(PHOTO_004) 없는 사진을 알려 선택에서 빼게 하고 안내한다', async () => {
    const { result } = renderCreate();
    await loaded(result);
    const onMissingPhotos = vi.fn();

    act(() => result.current.create([...photoIds, '999'], participants, { onMissingPhotos }));

    await waitFor(() => expect(onMissingPhotos).toHaveBeenCalledWith(['999']));
    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.selectionStale(1));
    expect(router.push).not.toHaveBeenCalled();
    expect(result.current.creating).toBe(false);
  });

  it('사진함에서 넘어온 흐름은 멤버 선택을 기록에 남기지 않고 replace로 이동한다', async () => {
    const { result } = renderCreate();
    await loaded(result);

    act(() => result.current.create(photoIds, participants, { replace: true }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
    expect(router.push).not.toHaveBeenCalled();
  });
});
