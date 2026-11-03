import { useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
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

  it('오류 응답은 error 상태로 받아 화면이 code로 분기한다', async () => {
    server.use(http.get('/api/bunches/:bunchId/members', () => fail(403, 'AUTH_002')));
    const { result } = renderHook(() => useQuery(bunchMembersQueryOptions(bunchId)), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ code: 'AUTH_002' });
  });
});
