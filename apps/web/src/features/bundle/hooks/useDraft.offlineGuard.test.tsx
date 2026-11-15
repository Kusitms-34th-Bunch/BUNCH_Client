import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { createBundle } from '../api/bundles';
import { type DraftState, useDraft } from './useDraft';

// 실시간 연결 상태만 바꿔 가며 끊김 중의 편집 차단을 확인(연결 자체는 useBundleRealtime 테스트가 다룸)
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

const { memberA, memberB } = MOCK_MEMBER_IDS;
const bunchId = String(MOCK_BUNCH_ID);
// 저장은 입력이 1초 멈추면 시작함
const PAST_SAVE_DELAY = 1500;

const ready = (state: DraftState) => {
  if (state.kind !== 'ready') throw new Error(`state is ${state.kind}`);
  return state;
};

const serverBundle = (id: string) =>
  mockDb.get().bundles.find((bundle) => String(bundle.id) === id);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const renderReady = async () => {
  const id = (
    await createBundle(
      bunchId,
      [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5)],
      createIdempotencyKey(),
      [String(memberA)],
    )
  ).id;
  const view = renderHook(() => useDraft(id), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  });
  await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
  const setDown = (down: boolean) => {
    connection.down = down;
    act(() => view.rerender());
  };
  return { id, ...view, setDown };
};

beforeEach(() => {
  connection.down = false;
});

describe('useDraft 연결이 끊긴 동안의 편집(기능 spec 4.3.14)', () => {
  it('이미 열려 있던 입력·시트에서 늦게 확정해도 제목·날짜는 서버로 보내지 않는다', async () => {
    const { id, result, setDown } = await renderReady();
    setDown(true);

    act(() => {
      result.current.actions.setTitle('끊긴 뒤 제목');
      result.current.actions.setDate('2026-10-18');
    });
    await act(() => wait(PAST_SAVE_DELAY));

    expect(serverBundle(id)?.title).toBe('');
    expect(serverBundle(id)?.date).toBeNull();
    expect(ready(result.current.state).draft.title).toBe('');
  });

  it('참여 멤버를 추가하거나 내보내는 요청도 보내지 않는다', async () => {
    const { id, result, setDown } = await renderReady();
    const before = serverBundle(id)?.participants.map((participant) => participant.memberId);
    setDown(true);

    act(() => {
      result.current.actions.addMember(String(memberB));
      result.current.actions.removeMember(String(memberA));
    });
    await act(() => wait(300));

    expect(serverBundle(id)?.participants.map((participant) => participant.memberId)).toEqual(
      before,
    );
  });

  it('사진을 빼는 요청도 보내지 않는다', async () => {
    const { id, result, setDown } = await renderReady();
    const photoId = ready(result.current.state).draft.photos[0]!.id;
    setDown(true);

    act(() => result.current.actions.removePhoto(photoId));
    await act(() => wait(300));

    expect(serverBundle(id)?.photos).toHaveLength(2);
    expect(ready(result.current.state).draft.photos).toHaveLength(2);
  });

  it('다시 연결되면 편집이 다시 저장된다', async () => {
    const { id, result, setDown } = await renderReady();
    setDown(true);
    setDown(false);

    act(() => result.current.actions.setDate('2026-10-18'));

    await waitFor(() => expect(serverBundle(id)?.date).toBe('2026-10-18'), { timeout: 5000 });
  });

  it('공개 범위 선택은 서버에 보내는 값이 아니라 끊긴 동안에도 고를 수 있다', async () => {
    const { result, setDown } = await renderReady();
    setDown(true);

    act(() => result.current.actions.setVisibility('members'));

    expect(ready(result.current.state).draft.visibility).toBe('members');
  });
});
