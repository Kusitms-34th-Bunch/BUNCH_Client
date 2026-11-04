import { useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { leaseTransport } from '../api/leases';
import {
  bundleQueryOptions,
  useCreateBundleMutation,
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
    id = (await result.current.mutateAsync(photoIds)).id;
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
