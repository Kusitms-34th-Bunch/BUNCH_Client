import { useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { delay, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { bunchMembersQueryOptions } from './bunchMembers';
import { photoBoxKeys } from './keys';

const bunchId = String(MOCK_BUNCH_ID);

describe('bunchMembersQueryOptions', () => {
  it('화면은 options를 useQuery로 읽고, 결과는 번치별 key에 캐시된다', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useQuery(bunchMembersQueryOptions(bunchId)), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
    expect(client.getQueryData(photoBoxKeys.members(bunchId))).toEqual(result.current.data);
  });

  it('번치를 아직 모르면 요청하지 않는다', () => {
    const { result } = renderHook(() => useQuery(bunchMembersQueryOptions(undefined)), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('번치가 바뀌면 이전 번치의 진행 중 요청을 취소한다', async () => {
    const signals = new Map<string, AbortSignal>();
    server.use(
      http.get('/api/bunches/:bunchId/members', async ({ params, request }) => {
        signals.set(String(params.bunchId), request.signal);
        await delay('infinite');
      }),
    );
    const client = createTestQueryClient();
    const { rerender, unmount } = renderHook(({ id }) => useQuery(bunchMembersQueryOptions(id)), {
      wrapper: createQueryWrapper(client),
      initialProps: { id: '1' },
    });
    await waitFor(() => expect(signals.has('1')).toBe(true));

    rerender({ id: '2' });

    // 구독자가 없어진 query는 Query가 signal로 요청을 끊음
    await waitFor(() => expect(signals.get('1')?.aborted).toBe(true));
    // 취소는 오류가 아니라 요청 전 상태로 되돌림(오류 화면·재시도 없음)
    expect(client.getQueryState(photoBoxKeys.members('1'))).toMatchObject({
      status: 'pending',
      fetchStatus: 'idle',
    });
    unmount();
  });

  it('오류 응답은 error 상태로 받아 화면이 code로 분기한다', async () => {
    server.use(http.get('/api/bunches/:bunchId/members', () => fail(403, 'AUTH_002')));
    const { result } = renderHook(() => useQuery(bunchMembersQueryOptions(bunchId)), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'AUTH_002' });
  });
});
