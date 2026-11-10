import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import type { CreatedBunch } from '../api/bunches';
import { ONBOARDING_PATHS } from '../constants/paths';
import { CreateBunchDraftProvider } from '../contexts/CreateBunchDraftProvider';
import { useCreatedBunchInvitation } from './useCreatedBunchInvitation';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const CREATED: CreatedBunch = { id: '7', name: '퇴근런클럽', characterType: 'TYPE_1' };
const wrapperFor = (createdBunch?: CreatedBunch) => {
  const Query = createQueryWrapper();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Query>
        <CreateBunchDraftProvider {...(createdBunch ? { initial: { createdBunch } } : {})}>
          {children}
        </CreateBunchDraftProvider>
      </Query>
    );
  };
};
const INVITATION = { url: 'https://bunch.app/invite/abc', code: 'ABCD1234', expiresAt: 'x' };

describe('useCreatedBunchInvitation', () => {
  beforeEach(() => replace.mockClear());

  it('만든 번치의 초대 링크를 불러온다', async () => {
    server.use(http.post('/api/bunches/7/invitations', () => ok(INVITATION)));
    const { result } = renderHook(() => useCreatedBunchInvitation(), {
      wrapper: wrapperFor(CREATED),
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.url).toBe('https://bunch.app/invite/abc'));
    expect(result.current.loading).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it('불러오기에 실패하면 failed이고 다시 불러오기로 성공할 수 있다', async () => {
    let calls = 0;
    server.use(
      http.post('/api/bunches/7/invitations', () =>
        ++calls === 1 ? fail(503, 'AUTH_018') : ok(INVITATION),
      ),
    );
    const { result } = renderHook(() => useCreatedBunchInvitation(), {
      wrapper: wrapperFor(CREATED),
    });

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.url).toBeUndefined();

    result.current.retry();

    await waitFor(() => expect(result.current.url).toBe('https://bunch.app/invite/abc'));
  });

  it('만든 번치가 없으면 요청하지 않고 첫 단계로 보낸다', () => {
    let requested = false;
    server.use(
      http.post('/api/bunches/:id/invitations', () => {
        requested = true;
        return ok(INVITATION);
      }),
    );
    const { result } = renderHook(() => useCreatedBunchInvitation(), { wrapper: wrapperFor() });

    expect(result.current.ready).toBe(false);
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunch);
    expect(requested).toBe(false);
  });
});
