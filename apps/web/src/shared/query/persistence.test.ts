import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  queryPersister,
  shouldPersistQuery,
  useClearPersistedQueriesWhen,
  usePersistedOwnerReady,
} from './persistence';
import { createQueryWrapper } from './testing';

const seed = (client: QueryClient) => {
  client.setQueryDefaults(['persisted'], { meta: { persist: true } });
  client.setQueryData(['persisted'], 1);
  client.setQueryData(['memory-only'], 2);
};

describe('쿼리 캐시 영속화', () => {
  it('persist 표시가 있고 데이터를 받은 query만 저장한다', () => {
    const client = new QueryClient();
    seed(client);
    const cache = client.getQueryCache();
    expect(shouldPersistQuery(cache.find({ queryKey: ['persisted'] })!)).toBe(true);
    expect(shouldPersistQuery(cache.find({ queryKey: ['memory-only'] })!)).toBe(false);
  });

  it('비로그인이 확인되면 저장 대상 query와 저장본을 지운다', () => {
    localStorage.setItem('bunch-query-cache:bunch', '{}');
    localStorage.setItem('bunch-query-cache:feed', '{}');
    localStorage.setItem('other-key', 'keep');
    const client = new QueryClient();
    seed(client);

    const { rerender } = renderHook(({ anonymous }) => useClearPersistedQueriesWhen(anonymous), {
      wrapper: createQueryWrapper(client),
      initialProps: { anonymous: false },
    });
    expect(localStorage.getItem('bunch-query-cache:bunch')).toBe('{}');

    rerender({ anonymous: true });
    expect(client.getQueryData(['persisted'])).toBeUndefined();
    expect(client.getQueryData(['memory-only'])).toBe(2);
    // 탭(첫 화면)별로 나뉜 저장본을 모두 지우고 다른 키는 둠
    expect(localStorage.getItem('bunch-query-cache:bunch')).toBeNull();
    expect(localStorage.getItem('bunch-query-cache:feed')).toBeNull();
    expect(localStorage.getItem('other-key')).toBe('keep');
  });
});

describe('저장본 주인 확인', () => {
  // 테스트 문서 주소가 `/`라 저장 키는 첫 경로 조각이 빈 값
  const KEY = 'bunch-query-cache:';
  const save = (owner?: string) =>
    localStorage.setItem(
      KEY,
      JSON.stringify({
        timestamp: Date.now(),
        buster: '',
        clientState: { queries: [], mutations: [] },
        ...(owner ? { owner } : {}),
      }),
    );
  const renderOwner = (client: QueryClient, memberId: string | undefined) =>
    renderHook(({ id }) => usePersistedOwnerReady(id), {
      wrapper: createQueryWrapper(client),
      initialProps: { id: memberId },
    });

  beforeEach(() => {
    // 앞 테스트의 회원 상태를 비로그인으로 되돌림
    renderHook(() => useClearPersistedQueriesWhen(true), {
      wrapper: createQueryWrapper(new QueryClient()),
    });
  });

  it('회원을 확인하기 전에는 저장하지 않는다', async () => {
    await queryPersister.persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState: { queries: [], mutations: [] },
    });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('다른 회원의 저장본을 복원했으면 화면을 그리기 전에 지운다', async () => {
    save('A');
    await queryPersister.restoreClient();
    const client = new QueryClient();
    seed(client);

    const { result } = renderOwner(client, 'B');
    expect(result.current).toBe(true);
    expect(client.getQueryData(['persisted'])).toBeUndefined();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('주인 표시가 없는 저장본도 지운다', async () => {
    save();
    await queryPersister.restoreClient();
    const client = new QueryClient();
    seed(client);

    renderOwner(client, 'B');
    expect(client.getQueryData(['persisted'])).toBeUndefined();
  });

  it('같은 회원의 저장본은 그대로 쓰고, 같은 화면에서 회원이 바뀌면 지운다', async () => {
    save('A');
    await queryPersister.restoreClient();
    const client = new QueryClient();
    seed(client);

    const { result, rerender } = renderOwner(client, 'A');
    expect(result.current).toBe(true);
    expect(client.getQueryData(['persisted'])).toBe(1);

    rerender({ id: 'B' });
    expect(result.current).toBe(true);
    expect(client.getQueryData(['persisted'])).toBeUndefined();
  });
});
