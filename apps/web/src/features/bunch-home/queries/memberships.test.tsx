import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { useChangeMembershipMutation } from './memberships';

const transfer = {
  change: { kind: 'transfer', membershipId: '2' },
  base: { actorMembershipId: '1', expectedMembershipVersion: 3 },
} as const;

// 관리자 넘기기 요청마다 보낸 멱등 키를 모으고, 정한 응답을 차례로 돌려줌
const recordTransfers = (...responses: (() => Response)[]) => {
  const keys: (string | null)[] = [];
  server.use(
    http.post('/api/bunches/:bunchId/owner-transfer', ({ request }) => {
      keys.push(request.headers.get('Idempotency-Key'));
      return (responses[keys.length - 1] ?? responses.at(-1)!)();
    }),
  );
  return keys;
};

const renderMutation = () =>
  renderHook(() => useChangeMembershipMutation('1'), {
    wrapper: createQueryWrapper(createTestQueryClient()),
  });

describe('useChangeMembershipMutation 관리자 넘기기의 멱등 키', () => {
  it('응답을 못 받고 같은 요청을 다시 보내면 같은 키를 보내 서버가 같은 요청으로 알아본다', async () => {
    const keys = recordTransfers(() => HttpResponse.error());
    const { result } = renderMutation();

    await act(() => result.current.mutateAsync(transfer).catch(() => undefined));
    await act(() => result.current.mutateAsync(transfer).catch(() => undefined));

    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it('서버가 확정 거절(4xx)했으면 다음 요청은 새 키로 보낸다', async () => {
    const keys = recordTransfers(() => fail(409, 'MEMBERSHIP_001'));
    const { result } = renderMutation();

    await act(() => result.current.mutateAsync(transfer).catch(() => undefined));
    await act(() => result.current.mutateAsync(transfer).catch(() => undefined));

    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[1]).not.toBe(keys[0]);
  });
});
