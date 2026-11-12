import { useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { leaseTransport } from '../api/leases';
import {
  bundleQueryOptions,
  useCreateBundleMutation,
  useDeleteBundleMutation,
  useLeaveBundleMutation,
  usePublishBundleMutation,
  useSaveTitleMutation,
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
    id = (await result.current.mutateAsync({ photoIds })).id;
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

  it('상세 query는 번들을 아직 모르면 요청하지 않는다', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useQuery(bundleQueryOptions(bunchId, undefined)), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('제목을 저장하면 응답으로 상세 캐시가 바로 최신이 된다', async () => {
    const { client, wrapper } = setup();
    const id = await createDraft(wrapper);
    const { result } = renderHook(() => useSaveTitleMutation(bunchId, id), { wrapper });
    const lease = await leaseTransport.acquire(bunchId, id, 'TITLE');

    await act(async () => {
      await result.current.mutateAsync({
        value: '설악산',
        expectedVersion: 0,
        mode: 'DRAFT',
        leaseToken: lease.token,
      });
    });

    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({
      title: '설악산',
      titleVersion: 1,
      revision: 2,
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
      await result.current.mutateAsync(revision);
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
      await result.current.mutateAsync(1).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'BUNDLE_005' }));
    expect(client.getQueryData(bundleKeys.detail(bunchId, id))).toMatchObject({ status: 'DRAFT' });
  });
});
