import { useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { BundleDetail } from '../model/bundle';
import { editTitle, ensureTitleCrdt, loadTitleDoc, saveTitleDoc } from '../lib/titleCrdt';
import {
  bundleQueryOptions,
  useCreateBundleMutation,
  useDeleteBundleMutation,
  useLeaveBundleMutation,
  usePublishBundleMutation,
  useApplyBundleEvent,
  useMergeTitleMutation,
  useSaveVisibilityMutation,
} from './bundles';
import { bundleKeys } from './keys';

const bunchId = String(MOCK_BUNCH_ID);
const photoIds = [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5)];

const setup = () => {
  const client = createTestQueryClient();
  return { client, wrapper: createQueryWrapper(client) };
};

const createDraft = async (wrapper: ReturnType<typeof createQueryWrapper>) => {
  const { result } = renderHook(() => useCreateBundleMutation(bunchId), { wrapper });
  let id = '';
  await act(async () => {
    id = (
      await result.current.mutateAsync({
        photoIds,
        participantMemberIds: [String(MOCK_MEMBER_IDS.memberA)],
      })
    ).id;
  });
  return id;
};

describe('번들 query·mutation', () => {
  it('초안을 만들면 상세 캐시가 응답으로 채워진다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);

    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({
      id,
      status: 'DRAFT',
      revision: 1,
    });
  });

  it('먼저 보낸 재조회 응답이 그사이 저장 응답으로 맞춘 더 새 revision의 캐시를 덮지 않는다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    const key = bundleKeys.detail(bunchId, id);
    const { result } = renderHook(() => useQuery(bundleQueryOptions(bunchId, id)), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const loaded = client.getQueryData<BundleDetail>(key) as BundleDetail;
    // GET 핸들러가 요청을 받은 것과 응답을 내보내는 시점을 테스트가 직접 정함(시간 대기에 기대지 않음)
    let reachedServer: () => void = () => undefined;
    const requestReachedServer = new Promise<void>((resolve) => (reachedServer = resolve));
    let sendResponse: () => void = () => undefined;
    const responseReleased = new Promise<void>((resolve) => (sendResponse = resolve));
    server.use(
      http.get('/api/bunches/:bunchId/bundles/:id', async () => {
        reachedServer();
        await responseReleased;
        return undefined;
      }),
    );

    // 재조회 요청이 서버에 도달해 응답을 기다리는 동안(조회 실패는 숨기지 않고 테스트를 실패시킴)
    let inflight: Promise<unknown> = Promise.resolve();
    act(() => {
      inflight = client.refetchQueries({ queryKey: key }, { throwOnError: true });
    });
    await requestReachedServer;
    // 저장 응답이 먼저 도착해 캐시를 더 새 revision으로 맞춤
    client.setQueryData(key, {
      ...loaded,
      revision: loaded.revision + 5,
      title: '저장 응답으로 맞춤',
    });
    // 그 뒤에 낡은 revision의 재조회 응답이 도착해도 캐시의 더 새 상태를 유지함
    sendResponse();
    await act(async () => {
      await inflight;
    });

    expect(client.getQueryState(key)).toMatchObject({ status: 'success', fetchStatus: 'idle' });
    expect(client.getQueryData<BundleDetail>(key)).toMatchObject({
      revision: loaded.revision + 5,
      title: '저장 응답으로 맞춤',
    });
  });

  it('상세 query는 번들을 아직 모르면 요청하지 않는다', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useQuery(bundleQueryOptions(bunchId, undefined)), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('제목 CRDT를 저장하면 병합 응답으로 상세 캐시의 제목 상태가 바로 최신이 된다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    const before = client.getQueryData<BundleDetail>(bundleKeys.detail(bunchId, id));
    await ensureTitleCrdt();
    const edited = editTitle(loadTitleDoc(before?.titleCrdtState ?? ''), '설악산');
    const { result } = renderHook(() => useMergeTitleMutation(bunchId, id), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(saveTitleDoc(edited));
    });

    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({
      title: '설악산',
      titleVersion: 1,
      titleTooLong: false,
      // 병합 응답에는 번들 revision이 없어 그대로 둠
      revision: before?.revision,
    });
  });

  it('버전 충돌이면 최신 상세를 다시 받아 캐시가 서버 값으로 맞춰진다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    // 캐시를 읽고 있는 화면이 있어야 무효화가 재요청으로 이어짐
    renderHook(() => useQuery(bundleQueryOptions(bunchId, id)), { wrapper });
    const { result } = renderHook(() => useSaveVisibilityMutation(bunchId, id), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ value: 'PUBLIC', expectedVersion: 0, mode: 'DRAFT' });
    });

    // 오래된 버전으로 다시 저장 → BUNDLE_003
    await act(async () => {
      await result.current
        .mutateAsync({ value: 'PRIVATE', expectedVersion: 0, mode: 'DRAFT' })
        .catch(() => undefined);
    });

    await waitFor(() =>
      expect(client.getQueryState(bundleKeys.detail(bunchId, id))?.isInvalidated).toBe(false),
    );
    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({
      visibility: 'PUBLIC',
      visibilityVersion: 1,
    });
  });

  it('발행에 성공하면 번치 홈 데이터(프로필·완성된 번들)를 무효화한다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    // 발행 조건을 채운 초안: 제목·공개 범위, 참여자 전원 코멘트
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) =>
        String(bundle.id) === id
          ? {
              ...bundle,
              title: '발행할 번들',
              titleVersion: 1,
              visibility: 'PRIVATE' as const,
              visibilityVersion: 1,
              comments: bundle.participants.map((p) => ({
                memberId: p.memberId,
                content: '코멘트',
                version: 1,
                createdAt: bundle.createdAt,
                updatedAt: bundle.createdAt,
              })),
              participants:
                bundle.participants.length >= 2
                  ? bundle.participants
                  : [...bundle.participants, { memberId: 2, joinedAt: bundle.createdAt }],
            }
          : bundle,
      ),
    }));
    // 번치 홈 데이터가 캐시에 있는 상태
    client.setQueryData(sharedKeys.bunchHome(bunchId), { stale: true });
    client.setQueryData(sharedKeys.publishedBundles(bunchId), { stale: true });
    const revision = mockDb.get().bundles.find((bundle) => String(bundle.id) === id)!.revision;
    const { result } = renderHook(() => usePublishBundleMutation(bunchId, id), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ visibility: 'PRIVATE', expectedRevision: revision });
    });

    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({
      status: 'PUBLISHED',
    });
    expect(client.getQueryState(sharedKeys.bunchHome(bunchId))?.isInvalidated).toBe(true);
    expect(client.getQueryState(sharedKeys.publishedBundles(bunchId))?.isInvalidated).toBe(true);
  });

  it('초안을 만들거나 삭제하거나 나가면 번치 홈 데이터(작성 중인 번들 포함)를 무효화한다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    const homeKeys = [
      sharedKeys.bunchHome(bunchId),
      sharedKeys.publishedBundles(bunchId),
      sharedKeys.draftBundles(bunchId),
    ];
    const seedHome = () => homeKeys.forEach((key) => client.setQueryData(key, { stale: true }));
    const invalidated = () =>
      homeKeys.every((key) => client.getQueryState(key)?.isInvalidated === true);

    seedHome();
    const { result: deleting } = renderHook(() => useDeleteBundleMutation(bunchId), { wrapper });
    await act(async () => {
      await deleting.current.mutateAsync(id);
    });
    expect(invalidated()).toBe(true);
    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toBeUndefined();

    const second = await createDraft(wrapper);
    seedHome();
    const { result: leaving } = renderHook(() => useLeaveBundleMutation(bunchId), { wrapper });
    await act(async () => {
      await leaving.current.mutateAsync(second);
    });
    expect(invalidated()).toBe(true);
    // 나가기는 작성 화면이 떠 있어 상세 캐시를 지우지 않음(지우면 그 화면이 「삭제된 번들」을 다시 받음)
    expect(client.getQueryData(bundleKeys.detail(bunchId, second))).toBeDefined();
  });

  it('삭제에 실패해도(이미 지워진 초안) 번치 홈 데이터를 서버 기준으로 다시 받는다', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(sharedKeys.draftBundles(bunchId), { stale: true });
    const { result } = renderHook(() => useDeleteBundleMutation(bunchId), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync('999999')).rejects.toBeDefined();
    });

    expect(client.getQueryState(sharedKeys.draftBundles(bunchId))?.isInvalidated).toBe(true);
  });

  it('조건이 모자란 발행은 실패하고 캐시는 초안 그대로다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    const { result } = renderHook(() => usePublishBundleMutation(bunchId, id), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ visibility: 'PUBLIC', expectedRevision: 1 })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'BUNDLE_005' }));
    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({ status: 'DRAFT' });
  });

  describe('번들 topic 이벤트(TITLE)', () => {
    const titleEvent = (revision: number, title: string, titleVersion: number) => ({
      type: 'TITLE',
      revision,
      data: { title, titleVersion, titleCrdtState: 'state', titleTooLong: false },
    });
    const apply = async () => {
      const { client, wrapper } = setup();
      const id = await createDraft(wrapper);
      const { result } = renderHook(() => useApplyBundleEvent(bunchId, id), { wrapper });
      const detail = () => client.getQueryData<BundleDetail>(bundleKeys.detail(bunchId, id));
      return { client, id, detail, apply: result.current };
    };

    it('바로 다음 revision이면 제목 상태와 revision을 반영하고 같은 이벤트가 다시 와도 결과가 같다', async () => {
      const { detail, apply: applyEvent } = await apply();
      const base = detail()?.revision ?? 0;

      applyEvent(titleEvent(base + 1, '새 제목', 5));
      applyEvent(titleEvent(base + 1, '새 제목', 5));

      expect(detail()).toMatchObject({
        title: '새 제목',
        titleVersion: 5,
        titleCrdtState: 'state',
        revision: base + 1,
      });
    });

    it('이미 반영된 revision이나 낡은 제목 버전은 무시한다', async () => {
      const { detail, apply: applyEvent } = await apply();
      const base = detail()?.revision ?? 0;

      applyEvent(titleEvent(base, '무시', 9));

      expect(detail()?.title).not.toBe('무시');
    });

    it('revision이 건너뛰면 이벤트를 쓰지 않고 상세를 다시 받는다', async () => {
      const { client, id, detail, apply: applyEvent } = await apply();
      renderHook(() => useQuery(bundleQueryOptions(bunchId, id)), {
        wrapper: createQueryWrapper(client),
      });
      const base = detail()?.revision ?? 0;

      applyEvent(titleEvent(base + 3, '건너뜀', 9));

      expect(detail()?.title).not.toBe('건너뜀');
      await waitFor(() =>
        expect(client.getQueryState(bundleKeys.detail(bunchId, id))?.isInvalidated).toBe(true),
      );
    });

    it('길이 초과 제목은 발행 사유에 TITLE_TOO_LONG을 넣고 줄어들면 뺀다', async () => {
      const { detail, apply: applyEvent } = await apply();
      const base = detail()?.revision ?? 0;

      applyEvent({
        ...titleEvent(base + 1, '가'.repeat(41), 6),
        data: {
          ...titleEvent(0, '', 0).data,
          title: '가'.repeat(41),
          titleVersion: 6,
          titleTooLong: true,
        },
      });
      expect(detail()?.publishBlockers).toContain('TITLE_TOO_LONG');

      applyEvent(titleEvent(base + 2, '짧게', 7));
      expect(detail()?.publishBlockers).not.toContain('TITLE_TOO_LONG');
    });

    it('TITLE이 아닌 이벤트와 모양이 다른 내용은 건드리지 않는다', async () => {
      const { detail, apply: applyEvent } = await apply();
      const before = detail();

      applyEvent({ type: 'DATE', revision: 99, data: {} });
      applyEvent('garbage');

      expect(detail()).toBe(before);
    });
  });
});
