import type * as DesignSystem from '@app/design-system';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { bunchHomeKeys } from '../../queries/keys';
import { membershipsQueryOptions } from '../../queries/memberships';
import { BunchHome } from '../home/BunchHome';
import { BunchMenu } from './BunchMenu';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast,
}));

const BUNCH_ID = String(MOCK_BUNCH_ID);

afterEach(() => server.events.removeAllListeners());

// 초대 링크 발급 요청(POST)을 셈
const countInvitationRequests = () => {
  const calls: string[] = [];
  server.events.on('request:start', ({ request }) => {
    if (request.method === 'POST' && new URL(request.url).pathname.endsWith('/invitations')) {
      calls.push(request.url);
    }
  });
  return calls;
};

describe('번치 더보기 미리 받기', () => {
  it('번치 홈을 그리면 더보기·멤버 관리에 쓸 멤버 목록을 미리 받는다', async () => {
    const client = createTestQueryClient();
    render(<BunchHome />, { wrapper: createQueryWrapper(client) });

    await waitFor(() =>
      expect(client.getQueryData(sharedKeys.bunchMemberships(BUNCH_ID))).toBeDefined(),
    );
  });

  it('메뉴를 그리면 차단 목록을 미리 받고, 초대 링크는 「멤버 초대」를 누르기 시작할 때만 받는다', async () => {
    const client = createTestQueryClient();
    const invitations = countInvitationRequests();
    render(<BunchMenu />, { wrapper: createQueryWrapper(client) });

    const invite = await screen.findByRole('link', { name: '멤버 초대' });
    await waitFor(() =>
      expect(client.getQueryData(bunchHomeKeys.blockPages(BUNCH_ID))).toBeDefined(),
    );
    expect(invitations).toHaveLength(0);

    fireEvent.pointerDown(invite);

    await waitFor(() =>
      expect(client.getQueryData(sharedKeys.bunchInvitation(BUNCH_ID))).toBeDefined(),
    );
    expect(invitations).toHaveLength(1);
  });

  it('역할을 알기 전에는 메뉴 대신 메뉴 모양 자리 표시와 불러오는 중 안내를 보인다', async () => {
    render(<BunchMenu />, { wrapper: createQueryWrapper(createTestQueryClient()) });

    expect(screen.getByRole('status').textContent).toBe('메뉴를 불러오는 중이에요');
    expect(screen.queryByRole('link', { name: '멤버 초대' })).toBeNull();
    expect(await screen.findByRole('link', { name: '멤버 초대' })).toBeTruthy();
  });

  // 미리 받은 목록(버전 `cachedVersion`)으로 메뉴를 그리고, 화면이 다시 받는 응답을 붙잡은 채 나가기를 확인
  // 돌려주는 값이 없는 handler는 원래 handler로 넘어감. 보낸 나가기 본문을 모음
  const leaveWhileRefetching = async (cachedVersion: (_fresh: number) => number) => {
    const user = userEvent.setup();
    const client = createTestQueryClient();
    await client.prefetchQuery(membershipsQueryOptions(BUNCH_ID));
    const fresh = client.getQueryData<{ membershipVersion: number }>(
      sharedKeys.bunchMemberships(BUNCH_ID),
    )!.membershipVersion;
    client.setQueryData<{ membershipVersion: number }>(
      sharedKeys.bunchMemberships(BUNCH_ID),
      (current) => current && { ...current, membershipVersion: cachedVersion(fresh) },
    );
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    server.use(http.get('/api/bunches/:bunchId/memberships', () => held, { once: true }));
    const sent: unknown[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/leave')) {
        void request
          .clone()
          .json()
          .then((body) => sent.push(body));
      }
    });
    render(<BunchMenu />, { wrapper: createQueryWrapper(client) });

    await user.click(await screen.findByRole('button', { name: '번치 나가기' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '나가기' }),
    );
    expect(sent).toHaveLength(0);
    release();
    return { sent, fresh };
  };

  it('다시 받는 중에 나가기를 확인하면 응답을 기다리고, 목록이 그대로면 그 버전으로 보낸다', async () => {
    const { sent, fresh } = await leaveWhileRefetching((version) => version);

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ expectedMembershipVersion: fresh });
  });

  it('기다리는 사이 목록이 바뀌었으면 보내지 않고 실패를 알린다(새 목록으로 다시 고르게)', async () => {
    toast.mockClear();
    const { sent } = await leaveWhileRefetching((version) => version - 1);

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.leaveFailed));
    expect(sent).toHaveLength(0);
  });
});
