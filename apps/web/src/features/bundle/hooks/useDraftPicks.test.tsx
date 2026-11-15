import type * as DesignSystem from '@app/design-system';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { mockDrafts } from '@/mocks/db/drafts';
import { MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { Draft } from '../lib/types';
import { createBundle } from '../api/bundles';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { draftFixture } from '../fixtures/draft.fixture';
import { toDraft } from '../lib/draftMapping';
import { bundleQueryOptions } from '../queries/bundles';
import { useDraftPicks } from './useDraftPicks';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const me = String(MOCK_MY_MEMBER_ID);

// 가짜 서버에 초안을 만들고 상세 캐시를 채운 뒤, 픽 화면이 쓰는 Draft(서버 픽 포함)를 만듦
const setup = async (options: { blocked?: boolean } = {}) => {
  const client = createTestQueryClient();
  const profile = await client.fetchQuery(myProfileQueryOptions());
  const bunchId = profile.bunch!.id;
  const created = await createBundle(
    bunchId,
    [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5)],
    crypto.randomUUID(),
    [String(MOCK_MEMBER_IDS.memberA)],
  );
  await client.fetchQuery(bundleQueryOptions(bunchId, created.id));
  const detail = () => client.getQueryData(bundleQueryOptions(bunchId, created.id).queryKey)!;
  const draftOf = (): Draft => ({
    ...toDraft({ detail: detail(), bunchMembers: [], locations: [] }),
    members: draftFixture.members,
  });
  const hook = renderHook(({ draft, blocked }) => useDraftPicks(draft, me, blocked), {
    wrapper: createQueryWrapper(client),
    initialProps: { draft: draftOf(), blocked: options.blocked ?? false },
  });
  // 캐시가 바뀌면 화면의 draft도 새로 만들어 넘김(실제로는 useDraft가 같은 일을 함)
  const refresh = () => hook.rerender({ draft: draftOf(), blocked: options.blocked ?? false });
  const photoIds = created.photos.map((photo) => photo.id);
  const serverRow = (photoId: string) =>
    mockDrafts()[0]!.photos.find((photo) => String(photo.id) === photoId)?.picks;
  const queryKey = bundleQueryOptions(bunchId, created.id).queryKey;
  return { client, hook, detail, refresh, photoIds, serverRow, draftOf, queryKey };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDraftPicks', () => {
  it('누르면 화면에 먼저 반영하고 서버에 저장한 뒤 서버 값으로 맞춘다', async () => {
    const { hook, detail, refresh, photoIds, serverRow } = await setup();
    const [first] = photoIds;

    act(() => hook.result.current.toggle(first!));

    expect(hook.result.current.picks[first!]).toEqual([me]);
    await waitFor(() => expect(detail().photos[0]!.picks?.pickedByMe).toBe(true));
    expect(serverRow(first!)).toEqual([
      expect.objectContaining({ memberId: MOCK_MY_MEMBER_ID, picked: true }),
    ]);
    refresh();
    await waitFor(() => expect(hook.result.current.picks[first!]).toEqual([me]));
  });

  it('저장보다 먼저 시작한 재조회가 나중에 도착해도 방금 저장한 픽이 되돌아가지 않는다', async () => {
    const { client, hook, detail, refresh, photoIds, queryKey } = await setup();
    const [first] = photoIds;
    // 저장 전에 시작한 재조회가 받아 온 옛 상세(내 픽 없음, 같은 revision)
    const stale = structuredClone(detail());
    act(() => hook.result.current.toggle(first!));
    await waitFor(() => expect(detail().photos[0]!.picks?.pickedByMe).toBe(true));

    act(() => {
      client.setQueryData(queryKey, stale);
    });

    expect(detail().photos[0]!.picks?.pickedByMe).toBe(true);
    // 다음 누름도 저장된 버전을 기준으로 보내 충돌 없이 해제됨
    refresh();
    act(() => hook.result.current.toggle(first!));
    await waitFor(() => expect(detail().photos[0]!.picks?.pickedByMe).toBe(false));
    expect(toast).not.toHaveBeenCalled();
  });

  it('다시 누르면 픽을 해제한다', async () => {
    const { hook, detail, refresh, photoIds } = await setup();
    const [first] = photoIds;
    act(() => hook.result.current.toggle(first!));
    await waitFor(() => expect(detail().photos[0]!.picks?.pickedByMe).toBe(true));
    refresh();

    act(() => hook.result.current.toggle(first!));

    expect(hook.result.current.picks[first!]).toEqual([]);
    await waitFor(() => expect(detail().photos[0]!.picks?.pickedByMe).toBe(false));
  });

  it('연타하면 마지막 상태만 저장한다(눌렀다 뗐다 다시 눌러도 요청은 최종 상태로 모인다)', async () => {
    const { hook, detail, photoIds, serverRow } = await setup();
    const [first] = photoIds;
    let requests = 0;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/photos/:photoId/pick', () => {
        requests += 1;
        return undefined;
      }),
    );

    act(() => {
      hook.result.current.toggle(first!);
      hook.result.current.toggle(first!);
      hook.result.current.toggle(first!);
    });

    expect(hook.result.current.picks[first!]).toEqual([me]);
    await waitFor(() => expect(detail().photos[0]!.picks?.pickedByMe).toBe(true));
    // 처음 요청 하나로 최종 상태(픽함)까지 저장하고 해제 요청은 서버에 보내지 않음
    expect(requests).toBe(1);
    expect(serverRow(first!)).toHaveLength(1);
  });

  it('서버가 버전 충돌로 현재 픽을 돌려주면 그 버전으로 같은 상태를 다시 보낸다', async () => {
    const { hook, detail, photoIds } = await setup();
    const [first] = photoIds;
    // 화면이 아는 버전(0)과 달리 서버에는 이미 내 해제 행(버전 1)이 있음
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        photos: bundle.photos.map((photo, index) =>
          index === 0
            ? { ...photo, picks: [{ memberId: MOCK_MY_MEMBER_ID, picked: false, version: 1 }] }
            : photo,
        ),
      })),
    }));

    act(() => hook.result.current.toggle(first!));

    await waitFor(() => expect(detail().photos[0]!.picks?.pickedByMe).toBe(true));
    expect(toast).not.toHaveBeenCalled();
  });

  it('저장하지 못하면 화면을 원래대로 돌리고 오류 토스트를 띄운다', async () => {
    const { hook, photoIds, detail } = await setup();
    const [first] = photoIds;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/photos/:photoId/pick', () =>
        fail(500, 'COMMON_999'),
      ),
    );

    act(() => hook.result.current.toggle(first!));
    expect(hook.result.current.picks[first!]).toEqual([me]);

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.pickFailed));
    await waitFor(() => expect(hook.result.current.picks[first!] ?? []).toEqual([]));
    expect(detail().photos[0]!.picks?.pickedByMe).toBe(false);
  });

  it('사진이 이미 없어졌으면(404) 오류 토스트 없이 되돌린다', async () => {
    const { hook, photoIds } = await setup();
    const [first] = photoIds;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/photos/:photoId/pick', () =>
        fail(404, 'RESOURCE_001'),
      ),
    );

    act(() => hook.result.current.toggle(first!));

    await waitFor(() => expect(hook.result.current.picks[first!] ?? []).toEqual([]));
    expect(toast).not.toHaveBeenCalled();
  });

  it('연결이 끊겨 편집을 막는 동안에는 눌러도 반응하지 않는다', async () => {
    const { hook, photoIds, serverRow } = await setup({ blocked: true });
    const [first] = photoIds;

    act(() => hook.result.current.toggle(first!));

    expect(hook.result.current.picks[first!] ?? []).toEqual([]);
    expect(serverRow(first!)).toBeUndefined();
  });

  it('서버가 알려 준 다른 멤버의 픽을 내 픽과 함께 보여 준다', async () => {
    const { client, hook, photoIds, refresh } = await setup();
    const [first] = photoIds;
    // 다른 멤버가 픽한 뒤 픽 화면에 다시 들어와 최신 상세를 받은 상태
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        photos: bundle.photos.map((photo, index) =>
          index === 0
            ? { ...photo, picks: [{ memberId: MOCK_MEMBER_IDS.memberA, picked: true, version: 5 }] }
            : photo,
        ),
      })),
    }));
    await client.refetchQueries({ queryKey: ['bundle'] });
    refresh();

    expect(hook.result.current.picks[first!]).toEqual([String(MOCK_MEMBER_IDS.memberA)]);

    act(() => hook.result.current.toggle(first!));
    expect(hook.result.current.picks[first!]).toEqual([String(MOCK_MEMBER_IDS.memberA), me]);
  });

  it('응답을 기다리는 사이 다시 누르면 첫 요청이 끝난 뒤 마지막 상태를 이어서 보낸다', async () => {
    const { hook, detail, photoIds } = await setup();
    const [first] = photoIds;
    const sent: boolean[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/photos/:photoId/pick', async ({ request }) => {
        sent.push(((await request.clone().json()) as { picked: boolean }).picked);
        // 첫 요청만 붙잡아 두고, 이어지는 요청은 가짜 서버로 넘김
        if (sent.length === 1) await gate;
        return undefined;
      }),
    );

    act(() => hook.result.current.toggle(first!));
    await waitFor(() => expect(sent).toEqual([true]));
    // 응답 전에 다시 누름(픽 해제): 요청을 겹쳐 보내지 않고 화면은 바로 해제 상태
    act(() => hook.result.current.toggle(first!));
    expect(hook.result.current.picks[first!]).toEqual([]);
    expect(sent).toEqual([true]);

    release();

    await waitFor(() => expect(sent).toEqual([true, false]));
    await waitFor(() => expect(detail().photos[0]!.picks?.pickedByMe).toBe(false));
    expect(toast).not.toHaveBeenCalled();
  });

  it('버전 충돌이 계속되면 정해진 횟수까지만 다시 보내고 실패로 알린다', async () => {
    const { hook, photoIds } = await setup();
    const [first] = photoIds;
    let requests = 0;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/photos/:photoId/pick', () => {
        requests += 1;
        // 서버가 늘 충돌로 답하는 경우(detail은 여전히 내 픽 없음)
        return fail(409, 'BUNDLE_003', {
          count: 0,
          pickedByMe: false,
          version: requests,
          members: [],
        });
      }),
    );

    act(() => hook.result.current.toggle(first!));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.pickFailed));
    // 처음 한 번과 충돌 뒤 재전송 두 번
    expect(requests).toBe(3);
    await waitFor(() => expect(hook.result.current.picks[first!] ?? []).toEqual([]));
  });

  it('픽 화면에 들어올 때 상세를 다시 받고 받고 나면 synced가 된다', async () => {
    let detailReads = 0;
    server.use(
      http.get('/api/bunches/:bunchId/bundles/:id', () => {
        detailReads += 1;
        return undefined;
      }),
    );

    const { hook } = await setup();

    // setup이 상세를 한 번 받고, 화면이 들어올 때 한 번 더 받음
    await waitFor(() => expect(detailReads).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(hook.result.current.synced).toBe(true));
  });
});
