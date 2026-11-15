import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { createBundle } from '../api/bundles';
import { type DraftState, useDraft } from './useDraft';

// 실시간 연결 상태만 바꿔 가며 끊김 처리를 확인(연결 자체는 useBundleRealtime 테스트가 다룸)
const connection = vi.hoisted(() => ({ down: false }));
vi.mock('./useBundleRealtime', () => ({
  useBundleRealtime: () => ({
    enabled: true,
    status: connection.down ? 'reconnecting' : 'connected',
    down: connection.down,
    retry: () => undefined,
    sendPresence: () => false,
  }),
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
  const view = renderHook(() => useDraft(id), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  });
  await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
  const goDown = () => {
    connection.down = true;
    view.rerender();
  };
  return { id, ...view, goDown };
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  connection.down = false;
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
});
