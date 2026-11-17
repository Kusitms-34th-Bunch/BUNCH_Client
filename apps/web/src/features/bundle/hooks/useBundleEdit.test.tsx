import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { DraftPhoto, PlaceResult } from '../lib/types';
import { createBundle } from '../api/bundles';
import { type BundleEditState, useBundleEdit } from './useBundleEdit';

const bunchId = String(MOCK_BUNCH_ID);
const PUBLISHED_ID = '1';
const { S1, S2 } = MOCK_PHOTO_IDS;

const setRole = (role: 'OWNER' | 'CO_OWNER' | 'MEMBER') =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.map((membership) =>
      membership.memberId === MOCK_MY_MEMBER_ID && membership.bunchId === MOCK_BUNCH_ID
        ? { ...membership, role }
        : membership,
    ),
  }));

const place = (key: string): PlaceResult => ({
  id: `kakao:${key}`,
  provider: 'kakao',
  externalId: key,
  name: `장소 ${key}`,
  address: '서울 영등포구',
});

const newPhoto = (source: number): DraftPhoto => ({
  id: `draft-${source}`,
  src: `/mock/photos/${source}.jpg`,
  alt: `사진 ${source}`,
  takenAt: null,
  uploaderId: String(MOCK_MY_MEMBER_ID),
  sourcePhotoId: String(source),
});

const renderEdit = (bundleId = PUBLISHED_ID) =>
  renderHook(() => useBundleEdit(bunchId, bundleId), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  });

const ready = (state: BundleEditState) => {
  if (state.kind !== 'ready') throw new Error(`ready가 아님: ${state.kind}`);
  return state;
};

const renderReady = async () => {
  setRole('OWNER');
  const view = renderEdit();
  await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
  return view;
};

describe('useBundleEdit 상태', () => {
  it('메인 관리자는 서버 값 그대로 열고 바뀐 내용이 없어 저장할 수 없다', async () => {
    const { result } = await renderReady();

    const state = ready(result.current.state);
    expect(state.draft.title).toBe('강릉 커피 투어 ☕');
    expect(state.dirty).toBe(false);
    expect(state.canSave).toBe(false);
    expect(state.draft.photos).toHaveLength(1);
    expect(state.viewer.bunchRole).toBe('owner');
  });

  it('공동 관리자와 멤버는 forbidden이다', async () => {
    for (const role of ['CO_OWNER', 'MEMBER'] as const) {
      setRole(role);
      const { result } = renderEdit();

      await waitFor(() => expect(result.current.state.kind).toBe('forbidden'));
    }
  });

  it('다른 번치 주소로 열면 forbidden이다', async () => {
    setRole('OWNER');
    const { result } = renderHook(() => useBundleEdit('999', PUBLISHED_ID), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(['forbidden', 'missing']).toContain(result.current.state.kind));
  });

  it('없는 번들은 missing, 발행 전 초안은 draft이다', async () => {
    setRole('OWNER');
    const missing = renderEdit('99999');
    await waitFor(() => expect(missing.result.current.state.kind).toBe('missing'));

    const draft = await createBundle(bunchId, [String(S1)], createIdempotencyKey(), ['2']);
    const view = renderEdit(draft.id);
    await waitFor(() => expect(view.result.current.state.kind).toBe('draft'));
  });

  it('서버에서 받지 못하면 error이고 retry로 다시 받는다', async () => {
    setRole('OWNER');
    let fails = true;
    server.use(
      http.get('/api/bunches/:bunchId/bundles/:id', () =>
        fails ? fail(500, 'SERVER_ERROR') : undefined,
      ),
    );
    const { result } = renderEdit();
    await waitFor(() => expect(result.current.state.kind).toBe('error'));

    fails = false;
    const state = result.current.state;
    if (state.kind === 'error') act(() => state.retry());

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
  });
});

describe('useBundleEdit 편집', () => {
  it('제목·날짜를 바꾸면 바뀐 내용이 있다고 보고, 원래 값으로 되돌리면 없다고 본다', async () => {
    const { result } = await renderReady();

    act(() => {
      result.current.actions.setTitle('새 제목');
      result.current.actions.setDate('2026-10-18');
    });
    expect(ready(result.current.state)).toMatchObject({ dirty: true, canSave: true });
    expect(ready(result.current.state).draft).toMatchObject({
      title: '새 제목',
      date: '2026-10-18',
    });

    act(() => {
      result.current.actions.setTitle('강릉 커피 투어 ☕');
      result.current.actions.setDate('2026-09-20');
    });
    expect(ready(result.current.state).dirty).toBe(false);
  });

  it('제목이 비었거나 40자를 넘으면 바뀌어도 저장할 수 없다', async () => {
    const { result } = await renderReady();

    act(() => result.current.actions.setTitle('   '));
    expect(ready(result.current.state)).toMatchObject({ dirty: true, canSave: false });

    act(() => result.current.actions.setTitle('가'.repeat(41)));
    expect(ready(result.current.state).canSave).toBe(false);

    act(() => result.current.actions.setTitle('가'.repeat(40)));
    expect(ready(result.current.state).canSave).toBe(true);
  });

  it('사진은 마지막 1장을 빼지 못하고, 추가·순서 바꾸기는 바뀐 내용이 된다', async () => {
    const { result } = await renderReady();
    const original = ready(result.current.state).draft.photos[0]!;
    let removed = true;
    act(() => {
      removed = result.current.actions.removePhoto(original.id);
    });
    expect(removed).toBe(false);
    expect(ready(result.current.state).dirty).toBe(false);

    act(() => void result.current.actions.replacePhotos([newPhoto(S1), original]));
    expect(ready(result.current.state).draft.photos.map((photo) => photo.id)).toEqual([
      `draft-${S1}`,
      original.id,
    ]);
    expect(ready(result.current.state).dirty).toBe(true);

    act(() => result.current.actions.movePhoto(original.id, 0));
    expect(ready(result.current.state).draft.photos[0]?.id).toBe(original.id);
    act(() => void result.current.actions.removePhoto(`draft-${S1}`));
    expect(ready(result.current.state).dirty).toBe(false);
  });

  it('위치는 최대 3개이고 같은 장소는 더하지 않으며 더한 줄도 바꾸고 옮기고 지울 수 있다', async () => {
    const { result } = await renderReady();

    act(() => {
      result.current.actions.addLocation(place('a'));
      result.current.actions.addLocation(place('a'));
      result.current.actions.addLocation(place('b'));
      result.current.actions.addLocation(place('c'));
      result.current.actions.addLocation(place('d'));
    });
    const names = () => ready(result.current.state).draft.locations.map((row) => row.name);
    expect(names()).toEqual(['장소 a', '장소 b', '장소 c']);

    const [first, , third] = ready(result.current.state).draft.locations;
    act(() => result.current.actions.moveLocation(third!.id, 0));
    expect(names()).toEqual(['장소 c', '장소 a', '장소 b']);

    act(() => result.current.actions.replaceLocation(first!.id, place('z')));
    expect(names()).toEqual(['장소 c', '장소 z', '장소 b']);

    act(() => result.current.actions.removeLocation(first!.id));
    expect(names()).toEqual(['장소 c', '장소 b']);
    expect(ready(result.current.state).dirty).toBe(true);
  });
});

describe('useBundleEdit 저장', () => {
  it('바뀐 내용을 한 번에 보내고 저장하면 새 기준이 되어 바뀐 내용이 없어진다', async () => {
    const { result } = await renderReady();
    const original = ready(result.current.state).draft.photos[0]!;
    act(() => {
      result.current.actions.setTitle('  고친 제목  ');
      result.current.actions.setDate('2026-10-18');
      void result.current.actions.replacePhotos([newPhoto(S2), original]);
      result.current.actions.addLocation(place('a'));
    });

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.save();
    });

    expect(outcome).toBe('saved');
    const bundle = mockDb.get().bundles.find((item) => String(item.id) === PUBLISHED_ID);
    expect(bundle).toMatchObject({ title: '고친 제목', date: '2026-10-18' });
    expect(bundle?.photos.map((photo) => photo.photoId)).toEqual([S2, null]);
    expect(bundle?.locations.map((location) => location.name)).toEqual(['장소 a']);
    await waitFor(() => expect(ready(result.current.state).dirty).toBe(false));
    expect(ready(result.current.state).draft.title).toBe('고친 제목');
  });

  it('바뀐 내용이 없거나 제목이 비었으면 보내지 않는다', async () => {
    const { result } = await renderReady();
    let requests = 0;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/published', () => {
        requests += 1;
        return undefined;
      }),
    );

    let first: string | undefined;
    await act(async () => {
      first = await result.current.actions.save();
    });
    act(() => result.current.actions.setTitle(''));
    let second: string | undefined;
    await act(async () => {
      second = await result.current.actions.save();
    });

    expect([first, second]).toEqual(['skipped', 'skipped']);
    expect(requests).toBe(0);
  });

  it('편집하는 사이 서버 값이 바뀌면 conflict이고 편집은 그대로 두며 최신 값을 받아 다시 저장할 수 있다', async () => {
    const { result } = await renderReady();
    act(() => result.current.actions.setTitle('내 제목'));
    // 다른 곳에서 먼저 번들을 고침(revision이 오름)
    mockDb.update((state) => ({
      ...state,
      bundles: state.bundles.map((bundle) =>
        String(bundle.id) === PUBLISHED_ID ? { ...bundle, revision: bundle.revision + 1 } : bundle,
      ),
    }));

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.save();
    });
    expect(outcome).toBe('conflict');
    expect(ready(result.current.state).draft.title).toBe('내 제목');

    // 최신 revision을 받은 뒤 다시 저장하면 성공
    // 최신 revision이 화면 상태에 닿을 때까지 기다린 뒤(query 알림은 한 틱 뒤에 전달됨) 저장을 한 번만 호출
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      outcome = await result.current.actions.save();
    });
    expect(outcome).toBe('saved');
  });

  it('권한을 잃었으면 forbidden, 그사이 삭제됐으면 missing, 서버 오류면 failed이다', async () => {
    const { result } = await renderReady();
    act(() => result.current.actions.setTitle('제목 1'));

    setRole('CO_OWNER');
    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.actions.save();
    });
    expect(outcome).toBe('forbidden');

    setRole('OWNER');
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/published', () => fail(500, 'SERVER_ERROR')),
    );
    await act(async () => {
      outcome = await result.current.actions.save();
    });
    expect(outcome).toBe('failed');

    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/published', () => fail(404, 'RESOURCE_001')),
    );
    await act(async () => {
      outcome = await result.current.actions.save();
    });
    expect(outcome).toBe('missing');
  });
});
