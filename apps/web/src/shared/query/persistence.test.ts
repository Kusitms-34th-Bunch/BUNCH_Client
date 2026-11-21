import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersistedQueryStorage,
  PERSIST_MAX_AGE,
  persistedFirstPage,
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

  it('받은 지 24시간이 지난 데이터는 다시 저장하지 않는다(복원만 되고 다시 받지 않는 이전 번치 목록 등)', () => {
    const client = new QueryClient();
    client.setQueryDefaults(['persisted'], { meta: { persist: true } });
    client.setQueryData(['persisted'], 1, { updatedAt: Date.now() - PERSIST_MAX_AGE - 1 });
    expect(shouldPersistQuery(client.getQueryCache().find({ queryKey: ['persisted'] })!)).toBe(
      false,
    );
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

  it('저장본 시각이 24시간 안이어도 받은 지 24시간이 지난 항목은 복원하지 않는다', async () => {
    const state = (updatedAt: number) => ({
      data: 1,
      dataUpdatedAt: updatedAt,
      dataUpdateCount: 1,
      error: null,
      errorUpdateCount: 0,
      errorUpdatedAt: 0,
      fetchFailureCount: 0,
      fetchFailureReason: null,
      fetchMeta: null,
      isInvalidated: false,
      status: 'success',
      fetchStatus: 'idle',
    });
    localStorage.setItem(
      KEY,
      JSON.stringify({
        timestamp: Date.now(),
        buster: '',
        owner: 'A',
        clientState: {
          mutations: [],
          queries: [
            { queryKey: ['fresh'], queryHash: '["fresh"]', state: state(Date.now()) },
            {
              queryKey: ['old'],
              queryHash: '["old"]',
              state: state(Date.now() - PERSIST_MAX_AGE - 1),
            },
          ],
        },
      }),
    );

    const restored = await queryPersister.restoreClient();

    expect(restored?.clientState.queries.map((query) => query.queryKey)).toEqual([['fresh']]);
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

  it('같은 회원으로 확인된 뒤 다른 회원의 저장본을 다시 복원하면 지운다', async () => {
    save('A');
    await queryPersister.restoreClient();
    renderOwner(new QueryClient(), 'A');

    // 다른 탭이 B의 저장본을 쓰고 이 화면이 QueryProvider를 다시 붙여 복원함
    save('B');
    await queryPersister.restoreClient();
    const client = new QueryClient();
    seed(client);
    renderOwner(client, 'A');

    expect(client.getQueryData(['persisted'])).toBeUndefined();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('저장본을 지운 뒤에는 늦게 오는 이전 회원의 쓰기가 다시 만들지 않는다', async () => {
    vi.useFakeTimers();
    try {
      renderOwner(new QueryClient(), 'A');
      const pending = queryPersister.persistClient({
        timestamp: Date.now(),
        buster: '',
        clientState: { queries: [], mutations: [] },
      });
      // 로그아웃: 쓰기가 throttle로 미뤄진 사이에 지움
      clearPersistedQueryStorage();
      await vi.advanceTimersByTimeAsync(2000);
      await pending;
      expect(localStorage.getItem(KEY)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('첫 쪽만 저장하도록 표시한 쪽 단위 목록은 첫 쪽만 남기고, 메모리의 목록은 그대로 둔다', async () => {
    vi.useFakeTimers();
    try {
      renderOwner(new QueryClient(), 'A');
      const client = new QueryClient();
      client.setQueryDefaults(['feed'], persistedFirstPage);
      client.setQueryDefaults(['all-pages'], { meta: { persist: true } });
      const paged = { pages: ['first', 'second'], pageParams: [null, 'cursor-2'] };
      client.setQueryData(['feed'], paged);
      client.setQueryData(['all-pages'], paged);

      const pending = queryPersister.persistClient({
        timestamp: Date.now(),
        buster: '',
        clientState: dehydrate(client, { shouldDehydrateQuery: shouldPersistQuery }),
      });
      await vi.advanceTimersByTimeAsync(2000);
      await pending;

      const saved = JSON.parse(localStorage.getItem(KEY)!) as {
        clientState: { queries: { queryKey: string[]; state: { data: unknown } }[] };
      };
      const dataOf = (key: string) =>
        saved.clientState.queries.find((query) => query.queryKey[0] === key)?.state.data;
      expect(dataOf('feed')).toEqual({ pages: ['first'], pageParams: [null] });
      expect(dataOf('all-pages')).toEqual(paged);
      expect(client.getQueryData(['feed'])).toEqual(paged);
    } finally {
      vi.useRealTimers();
    }
  });

  it('첫 쪽만 남긴 저장본을 복원하면 다음 쪽을 이어 받을 수 있고, 다시 받을 때 첫 쪽부터 요청한다', async () => {
    const client = new QueryClient();
    // JSON으로 저장되며 첫 쪽 커서(undefined)는 null이 됨
    hydrate(client, {
      mutations: [],
      queries: [
        {
          queryKey: ['feed'],
          queryHash: '["feed"]',
          state: {
            ...client.getQueryCache().build(client, { queryKey: ['other'] }).state,
            data: { pages: [{ next: 'cursor-2' }], pageParams: [null] },
            status: 'success',
            dataUpdatedAt: Date.now() - 60_000,
          },
        },
      ],
    });
    const requested: unknown[] = [];
    const options = {
      queryKey: ['feed'],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
        requested.push(pageParam);
        return { next: pageParam ? null : 'cursor-2' };
      },
      getNextPageParam: (page: { next: string | null }) => page.next ?? undefined,
    };

    await client.fetchInfiniteQuery({ ...options, staleTime: 0 });

    expect(requested).toEqual([undefined]);
    await client.fetchInfiniteQuery({ ...options, pages: 2, staleTime: 0 });
    expect(requested.at(-1)).toBe('cursor-2');
  });
});
