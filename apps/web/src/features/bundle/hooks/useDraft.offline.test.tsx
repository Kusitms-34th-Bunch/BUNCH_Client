import type * as DesignSystem from '@app/design-system';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { createBundle } from '../api/bundles';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { bundleKeys } from '../queries/keys';
import { type DraftState, useDraft } from './useDraft';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 실시간 연결 상태만 바꿔 가며 끊김 처리를 확인(연결 자체는 useBundleRealtime 테스트가 다룸)
const connection = vi.hoisted(() => ({
  down: false,
  holdEvent: undefined as ((_type: string) => boolean) | undefined,
}));
vi.mock('./useBundleRealtime', () => ({
  useBundleRealtime: (
    _bunchId: unknown,
    _bundleId: unknown,
    _active: unknown,
    handlers?: { holdEvent?: (_type: string) => boolean },
  ) => {
    connection.holdEvent = handlers?.holdEvent;
    return {
      enabled: true,
      status: connection.down ? 'reconnecting' : 'connected',
      down: connection.down,
      // 렌더를 기다리지 않고 지금 상태를 바로 읽음(실제 훅의 isDown과 같은 계약)
      isDown: () => connection.down,
      retry: () => undefined,
      sendPresence: () => false,
    };
  },
}));

const { me } = MOCK_MEMBER_IDS;
const bunchId = String(MOCK_BUNCH_ID);
// 저장은 입력이 1초 멈추면 시작함
const PAST_SAVE_DELAY = 1500;

const ready = (state: DraftState) => {
  if (state.kind !== 'ready') throw new Error(`state is ${state.kind}`);
  return state;
};

const serverBundle = (id: string) =>
  mockDb.get().bundles.find((bundle) => String(bundle.id) === id);

const renderReady = async () => {
  const id = (
    await createBundle(
      bunchId,
      [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5)],
      createIdempotencyKey(),
      [String(MOCK_MEMBER_IDS.memberA)],
    )
  ).id;
  const client = createTestQueryClient();
  const view = renderHook(() => useDraft(id), { wrapper: createQueryWrapper(client) });
  await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
  const goDown = () => {
    connection.down = true;
    view.rerender();
  };
  return { id, client, ...view, goDown };
};

// 다른 멤버가 사진을 지운 것으로 가짜 서버 데이터를 바꿈
const removeServerPhoto = (bundleId: string, photoId: string) =>
  mockDb.update((current) => ({
    ...current,
    bundles: current.bundles.map((bundle) =>
      String(bundle.id) === bundleId
        ? { ...bundle, photos: bundle.photos.filter((photo) => photo.id !== Number(photoId)) }
        : bundle,
    ),
  }));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  connection.down = false;
  toast.mockClear();
});
afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  act(() => void window.dispatchEvent(new Event('online')));
});

describe('useDraft 연결이 끊겼을 때(기능 spec 4.3.14)', () => {
  it('저장 대기 중이던 제목·코멘트·날짜는 서버로 보내지 않고 화면에서도 되돌린다', async () => {
    const { id, result, goDown } = await renderReady();
    act(() => {
      result.current.actions.setTitle('끊기기 직전 제목');
      result.current.actions.setComment(String(me), '끊기기 직전 코멘트');
    });
    expect(ready(result.current.state).draft.title).toBe('끊기기 직전 제목');

    act(goDown);
    await act(() => wait(PAST_SAVE_DELAY));

    const bundle = serverBundle(id);
    expect(bundle?.title).toBe('');
    expect(bundle?.comments).toEqual([]);
    expect(ready(result.current.state).draft.title).toBe('');
    expect(ready(result.current.state).saveStatus).toBe('saved');
  });

  it('브라우저가 오프라인이 되어도(실시간 연결은 그대로) 저장 대기 중이던 입력을 보내지 않는다', async () => {
    const { id, result } = await renderReady();
    act(() => result.current.actions.setTitle('오프라인 직전 제목'));

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    act(() => void window.dispatchEvent(new Event('offline')));
    await act(() => wait(PAST_SAVE_DELAY));

    expect(serverBundle(id)?.title).toBe('');
    expect(ready(result.current.state).draft.title).toBe('');
  });

  it('날짜도 보내지 않는다', async () => {
    const { id, result, goDown } = await renderReady();
    act(() => result.current.actions.setDate('2026-10-18'));

    act(goDown);
    await act(() => wait(300));

    expect(serverBundle(id)?.date).toBeNull();
    expect(ready(result.current.state).draft.date).toBeNull();
  });

  it('끊기기 전에 저장이 끝난 입력은 그대로 남는다', async () => {
    const { id, result, goDown } = await renderReady();
    act(() => result.current.actions.setTitle('저장된 제목'));
    await waitFor(() => expect(serverBundle(id)?.title).toBe('저장된 제목'), { timeout: 5000 });
    await waitFor(() => expect(ready(result.current.state).saveStatus).toBe('saved'));

    act(goDown);

    expect(ready(result.current.state).draft.title).toBe('저장된 제목');
  });
});

describe('useDraft 내 변경 요청 중의 저장 이벤트', () => {
  it('내 사진 변경 요청이 진행 중이면 PHOTOS 이벤트는 적용하지 않고 끝나면 최신 상세로 맞춘다', async () => {
    const { id, result } = await renderReady();
    let detailRequests = 0;
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/photos/changes', async () => {
        await delay(200);
        return undefined;
      }),
      http.get('/api/bunches/:bunchId/bundles/:id', () => {
        detailRequests += 1;
        return undefined;
      }),
    );
    expect(connection.holdEvent?.('PHOTOS')).toBe(false);

    const photoId = ready(result.current.state).draft.photos[0]!.id;
    act(() => void result.current.actions.removePhoto(photoId));

    expect(connection.holdEvent?.('PHOTOS')).toBe(true);
    // 다른 type은 그대로 적용
    expect(connection.holdEvent?.('DATE')).toBe(false);
    await waitFor(() => expect(serverBundle(id)?.photos).toHaveLength(1), { timeout: 5000 });
    await waitFor(() => expect(connection.holdEvent?.('PHOTOS')).toBe(false), { timeout: 5000 });
    // 적용하지 못한 이벤트가 있었으므로 요청이 끝나면 상세를 다시 받음
    await waitFor(() => expect(detailRequests).toBeGreaterThan(0), { timeout: 5000 });
  });

  it('사진을 끄는 동안은 다른 멤버의 사진 변경을 화면에 적용하지 않고, 놓은 뒤 최신 목록으로 맞춘다(기능 spec 4.3.6)', async () => {
    const { id, result } = await renderReady();
    const shownIds = () => ready(result.current.state).draft.photos.map((photo) => photo.id);
    const [first, second] = ready(result.current.state).draft.photos;
    expect(connection.holdEvent?.('PHOTOS')).toBe(false);

    act(() => result.current.actions.setPhotoDragging(true, second!.id));
    // 끄는 동안 다른 멤버가 첫 사진을 지우고 그 저장 이벤트가 옴(적용하지 않고 보류)
    removeServerPhoto(id, first!.id);
    expect(connection.holdEvent?.('PHOTOS')).toBe(true);
    // 다른 type은 그대로 적용
    expect(connection.holdEvent?.('DATE')).toBe(false);
    // 끄는 동안은 화면의 목록이 그대로임
    expect(shownIds()).toEqual([first!.id, second!.id]);

    act(() => result.current.actions.setPhotoDragging(false));

    expect(connection.holdEvent?.('PHOTOS')).toBe(false);
    // 놓은 뒤 다시 받은 목록이 화면에 반영됨
    await waitFor(() => expect(shownIds()).toEqual([second!.id]), { timeout: 5000 });
  });

  it('끄는 동안 사진 변경 이벤트가 없었다면 놓은 뒤 상세를 다시 받지 않는다', async () => {
    const { id, client, result } = await renderReady();
    const photoId = ready(result.current.state).draft.photos[0]!.id;
    const detailFetching = () => client.isFetching({ queryKey: bundleKeys.detail(bunchId, id) });

    act(() => result.current.actions.setPhotoDragging(true, photoId));
    act(() => result.current.actions.setPhotoDragging(false));

    // 재조회가 시작됐다면 곧바로 가져오는 중으로 보이므로 기다릴 필요 없이 확인함
    expect(detailFetching()).toBe(0);
  });

  it('끌던 사진을 다른 멤버가 지웠으면 자리를 바꾸지 않고 놓아도 놓은 뒤 안내하고 그 사진을 없앤다(기능 spec 4.3.6)', async () => {
    const { id, result } = await renderReady();
    const shownIds = () => ready(result.current.state).draft.photos.map((photo) => photo.id);
    const [first, second] = ready(result.current.state).draft.photos;

    act(() => result.current.actions.setPhotoDragging(true, first!.id));
    removeServerPhoto(id, first!.id);
    expect(connection.holdEvent?.('PHOTOS')).toBe(true);
    act(() => result.current.actions.setPhotoDragging(false));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photoRemovedByOther), {
      timeout: 5000,
    });
    await waitFor(() => expect(shownIds()).toEqual([second!.id]), { timeout: 5000 });
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('끌던 사진이 아닌 다른 사진이 지워졌으면 지운 사진 안내를 띄우지 않는다', async () => {
    const { id, result } = await renderReady();
    const shownIds = () => ready(result.current.state).draft.photos.map((photo) => photo.id);
    const [first, second] = ready(result.current.state).draft.photos;

    act(() => result.current.actions.setPhotoDragging(true, first!.id));
    removeServerPhoto(id, second!.id);
    expect(connection.holdEvent?.('PHOTOS')).toBe(true);
    act(() => result.current.actions.setPhotoDragging(false));

    await waitFor(() => expect(shownIds()).toEqual([first!.id]), { timeout: 5000 });
    expect(toast).not.toHaveBeenCalledWith(BUNDLE_MESSAGES.photoRemovedByOther);
  });

  it('끌던 사진이 지워졌고 자리도 바꿔 이동 요청을 보냈다면 안내는 한 번만 띄운다', async () => {
    const { id, client, result } = await renderReady();
    const shownIds = () => ready(result.current.state).draft.photos.map((photo) => photo.id);
    const [first, second] = ready(result.current.state).draft.photos;

    act(() => result.current.actions.setPhotoDragging(true, first!.id));
    removeServerPhoto(id, first!.id);
    expect(connection.holdEvent?.('PHOTOS')).toBe(true);
    act(() => {
      result.current.actions.movePhoto(first!.id, 1);
      result.current.actions.setPhotoDragging(false);
    });

    await waitFor(() => expect(shownIds()).toEqual([second!.id]), { timeout: 5000 });
    await waitFor(() => expect(client.isFetching()).toBe(0), { timeout: 5000 });
    // 이동 응답 경로와 놓은 뒤 재조회 경로가 둘 다 안내하지 않고 한 번만
    expect(
      toast.mock.calls.filter(([message]) => message === BUNDLE_MESSAGES.photoRemovedByOther),
    ).toHaveLength(1);
  });

  it('요청이 끝난 뒤 다시 받은 상세로 보류했던 원격 사진 변경이 화면에 반영된다', async () => {
    const created = await createBundle(
      bunchId,
      [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5), String(MOCK_PHOTO_IDS.S1)],
      createIdempotencyKey(),
      [String(MOCK_MEMBER_IDS.memberA)],
    );
    const view = renderHook(() => useDraft(created.id), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    const [first, second, third] = ready(view.result.current.state).draft.photos;
    const shownIds = () => ready(view.result.current.state).draft.photos.map((photo) => photo.id);

    // 상세 재조회는 테스트가 풀어 줄 때까지 서버에서 붙잡아 둠(그 사이 원격 변경을 만듦)
    let releaseDetail: () => void = () => undefined;
    const detailGate = new Promise<void>((resolve) => (releaseDetail = resolve));
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/photos/changes', async () => {
        await delay(200);
        return undefined;
      }),
      http.get('/api/bunches/:bunchId/bundles/:id', async () => {
        await detailGate;
        return undefined;
      }),
    );

    act(() => void view.result.current.actions.removePhoto(first!.id));
    // 요청이 진행 중일 때 온 PHOTOS 이벤트는 보류됨
    expect(connection.holdEvent?.('PHOTOS')).toBe(true);
    // 내 사진 빼기가 서버에 반영된 뒤, 그 응답에는 없는 원격 변경(다른 멤버가 세 번째 사진을 뺌)을 만듦
    await waitFor(() => expect(serverBundle(created.id)?.photos).toHaveLength(2), {
      timeout: 5000,
    });
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) =>
        String(bundle.id) === created.id
          ? { ...bundle, photos: bundle.photos.filter((photo) => photo.id !== Number(third!.id)) }
          : bundle,
      ),
    }));
    releaseDetail();

    // 보류했던 이벤트 대신 다시 받은 상세가 반영되어 두 변경이 모두 보임
    await waitFor(() => expect(shownIds()).toEqual([second!.id]), { timeout: 5000 });
  });

  // 보류한 이벤트를 대신하는 재조회가 실패하는 경우: 사진 3장 번들에서 내가 첫 사진을 빼는 동안 이벤트를 보류시킴
  const startHeldRequest = async () => {
    const created = await createBundle(
      bunchId,
      [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5), String(MOCK_PHOTO_IDS.S1)],
      createIdempotencyKey(),
      [String(MOCK_MEMBER_IDS.memberA)],
    );
    const view = renderHook(() => useDraft(created.id), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    const [first, second, third] = ready(view.result.current.state).draft.photos;
    const shownIds = () => ready(view.result.current.state).draft.photos.map((photo) => photo.id);
    // 내 사진 빼기가 서버에 반영된 뒤 다른 멤버가 세 번째 사진을 뺀 것으로 만듦(그 응답에는 없는 원격 변경)
    const remoteRemovesThird = async () => {
      await waitFor(() => expect(serverBundle(created.id)?.photos).toHaveLength(2), {
        timeout: 5000,
      });
      mockDb.update((current) => ({
        ...current,
        bundles: current.bundles.map((bundle) =>
          String(bundle.id) === created.id
            ? { ...bundle, photos: bundle.photos.filter((photo) => photo.id !== Number(third!.id)) }
            : bundle,
        ),
      }));
    };
    return { id: created.id, view, first: first!, second: second!, shownIds, remoteRemovesThird };
  };

  it('보류한 이벤트를 대신하는 재조회가 실패해도 표시를 남겨 두었다가 다시 받아 화면을 맞춘다', async () => {
    const { view, first, second, shownIds, remoteRemovesThird } = await startHeldRequest();
    let detailRequests = 0;
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/photos/changes', async () => {
        await delay(200);
        return undefined;
      }),
      http.get('/api/bunches/:bunchId/bundles/:id', () => {
        detailRequests += 1;
        // 처음 한 번만 실패
        return detailRequests === 1 ? fail(500, 'SERVER_ERROR') : undefined;
      }),
    );

    act(() => void view.result.current.actions.removePhoto(first.id));
    expect(connection.holdEvent?.('PHOTOS')).toBe(true);
    await remoteRemovesThird();

    // 첫 재조회가 실패해도 잊지 않고 다시 받아 원격 변경까지 반영됨
    await waitFor(() => expect(shownIds()).toEqual([second.id]), { timeout: 5000 });
    expect(detailRequests).toBe(2);
  });

  it('재조회가 계속 실패하면 정해진 횟수(처음 포함 3번)만 다시 받아 보고 멈추며 배너로 알리고, 「재시도」로 다시 받는 동안에도 배너와 편집 제한을 유지하다가 성공하면 푼다', async () => {
    const { id, view, first, second, shownIds, remoteRemovesThird } = await startHeldRequest();
    let detailRequests = 0;
    let failing = true;
    let releaseRetry: () => void = () => undefined;
    const retryGate = new Promise<void>((resolve) => (releaseRetry = resolve));
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/photos/changes', async () => {
        await delay(200);
        return undefined;
      }),
      http.get('/api/bunches/:bunchId/bundles/:id', async () => {
        detailRequests += 1;
        if (failing) return fail(500, 'SERVER_ERROR');
        // 「재시도」로 다시 받는 요청은 테스트가 풀어 줄 때까지 서버에서 붙잡아 둠
        await retryGate;
        return undefined;
      }),
    );
    const banner = () => ready(view.result.current.state).realtime.down;
    expect(banner()).toBe(false);

    act(() => void view.result.current.actions.removePhoto(first.id));
    expect(connection.holdEvent?.('PHOTOS')).toBe(true);
    await remoteRemovesThird();

    // 모두 실패하면 연결 끊김과 같은 배너로 알리고 더 이상 자동으로 다시 받지 않음
    await waitFor(() => expect(detailRequests).toBe(3), { timeout: 6000 });
    await waitFor(() => expect(banner()).toBe(true));
    await act(() => wait(2500));
    expect(detailRequests).toBe(3);

    // 「재시도」로 다시 받는 요청이 진행 중인 동안에는 배너와 편집 제한이 그대로
    failing = false;
    act(() => ready(view.result.current.state).realtime.retry());
    await waitFor(() => expect(detailRequests).toBe(4), { timeout: 3000 });
    expect(banner()).toBe(true);
    act(() => void view.result.current.actions.setDate('2026-10-18'));
    await act(() => wait(300));
    expect(serverBundle(id)?.date).toBeNull();

    // 성공해야 화면이 맞춰지고 배너가 사라짐
    releaseRetry();
    await waitFor(() => expect(shownIds()).toEqual([second.id]), { timeout: 5000 });
    await waitFor(() => expect(banner()).toBe(false));
  });
});

describe('useDraft 요청을 보내는 중에 연결이 끊겼을 때(기능 spec 4.3.14)', () => {
  it('제목 요청을 기다리는 사이 끊기면 이어서 보낼 날짜·코멘트는 보내지 않는다', async () => {
    const { id, result, goDown } = await renderReady();
    // 제목 요청이 서버에서 처리되는 동안 연결이 끊기도록 늦춤
    server.use(
      http.patch('/api/bunches/:bunchId/bundles/:id/title/crdt', async () => {
        await delay(400);
        return undefined;
      }),
    );
    act(() => {
      result.current.actions.setTitle('끊기기 전에 보낸 제목');
      result.current.actions.setComment(String(me), '끊긴 뒤에는 보내지 않을 코멘트');
      // 날짜는 고르는 즉시 저장이 시작되어 제목 요청이 먼저 나감
      result.current.actions.setDate('2026-10-18');
    });
    await act(() => wait(100));

    act(goDown);
    await act(() => wait(1500));

    const bundle = serverBundle(id);
    expect(bundle?.date).toBeNull();
    expect(bundle?.comments).toEqual([]);
  });

  it('사진 구성 요청을 기다리는 사이 끊기면 이어서 보낼 순서 이동은 보내지 않는다', async () => {
    const created = await createBundle(
      bunchId,
      [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5), String(MOCK_PHOTO_IDS.S1)],
      createIdempotencyKey(),
      [String(MOCK_MEMBER_IDS.memberA)],
    );
    const view = renderHook(() => useDraft(created.id), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    const photos = ready(view.result.current.state).draft.photos;
    const [first, second, third] = photos;
    const orderOf = () => serverBundle(created.id)?.photos.map((photo) => photo.id);
    const before = orderOf();
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/photos/changes', async () => {
        await delay(400);
        return undefined;
      }),
    );

    // 첫 사진을 빼고 나머지 순서를 바꿈: 구성 변경 요청 뒤에 순서 이동 요청이 이어짐
    act(() => {
      view.result.current.actions.replacePhotos([third!, second!]);
    });
    await act(() => wait(100));
    connection.down = true;
    act(() => view.rerender());
    await act(() => wait(1500));

    // 이미 보낸 구성 변경(첫 사진 빼기)만 반영되고, 뒤이은 이동은 보내지 않아 남은 둘의 순서는 그대로
    const after = orderOf();
    expect(after).toEqual(before?.filter((photoId) => photoId !== Number(first!.id)));
  });

  it('실시간 연결만 끊기고(브라우저는 온라인) 화면이 아직 모르는 사이 첫 응답이 끝나도 대기 중이던 위치 변경은 보내지 않는다', async () => {
    const { id, result } = await renderReady();
    let first = true;
    server.use(
      http.post('/api/bunches/:bunchId/bundles/:id/locations/intents', async () => {
        if (first) {
          first = false;
          await delay(250);
        }
        return undefined;
      }),
    );
    const place = (key: string) => ({
      id: `test:${key}`,
      provider: 'test',
      externalId: key,
      name: `장소 ${key}`,
      address: '주소',
    });

    act(() => {
      result.current.actions.addLocation(place('a'));
      result.current.actions.addLocation(place('b'));
    });
    await act(() => wait(50));
    // 렌더(rerender) 없이 연결 상태만 바뀜: 훅의 effect가 끊김을 알아채기 전과 같은 상황
    connection.down = true;
    await act(() => wait(600));

    expect(serverBundle(id)?.locations.map((location) => location.name)).toEqual(['장소 a']);
    // 보내지 못한 둘째 변경의 낙관적 표시도 걷힘
    expect(ready(result.current.state).draft.locations.map((row) => row.name)).toEqual(['장소 a']);
  });
});
