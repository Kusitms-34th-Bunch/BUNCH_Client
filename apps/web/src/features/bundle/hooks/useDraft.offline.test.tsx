import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
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
