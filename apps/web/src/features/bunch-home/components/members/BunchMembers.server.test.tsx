import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberRole } from '@/mocks/db/types';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { getMemberships, transferOwner } from '../../api/memberships';
import { BunchMembers } from './BunchMembers';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, back: vi.fn(), push: vi.fn() }),
}));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// 시연 회원(큐시즘)의 역할을 바꿈. 메인 관리자로 만들면 원래 메인 관리자(지예)는 일반 멤버
const setMyRole = (role: MemberRole) =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.map((item) => {
      if (item.bunchId !== MOCK_BUNCH_ID) return item;
      if (item.memberId === MOCK_MY_MEMBER_ID) return { ...item, role };
      if (role === 'OWNER' && item.memberId === MOCK_MEMBER_IDS.admin) {
        return { ...item, role: 'MEMBER' };
      }
      return item;
    }),
  }));
const renderMembers = () =>
  render(<BunchMembers />, { wrapper: createQueryWrapper(createTestQueryClient()) });
const rows = () => screen.getAllByRole('listitem').map((item) => item.textContent ?? '');
const serverRoles = async () => {
  const roles: Record<string, string> = {};
  for (const m of (await getMemberships(String(MOCK_BUNCH_ID))).members) {
    roles[m.nickname ?? ''] = m.role;
  }
  return roles;
};
const confirmIn = async (menuLabel: string, confirmLabel: string, name: string) => {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: `${name} 관리` }));
  const menu = await screen.findByRole('alertdialog', { name: new RegExp(name) });
  await user.click(within(menu).getByRole('button', { name: menuLabel }));
  const confirm = await screen.findByRole('alertdialog', { name: new RegExp(name) });
  await user.click(within(confirm).getByRole('button', { name: confirmLabel }));
};

describe('BunchMembers 서버 멤버 관리', () => {
  it('서버 목록을 역할순으로 보이고, 일반 멤버는 아무도 관리하지 못한다', async () => {
    renderMembers();

    await screen.findByText('5/8명');
    expect(rows()[0]).toMatch(/지예/);
    expect(rows().some((row) => row.includes('큐시즘(나)'))).toBe(true);
    expect(screen.queryByRole('button', { name: /관리$/ })).toBeNull();
  });

  it('들어오거나 다시 받을 때는 초점을 옮기지 않는다', async () => {
    renderMembers();

    await screen.findByText('5/8명');
    expect(document.activeElement).toBe(document.body);
  });

  it('버전과 무관한 실패면 처리하지 못했다고 알리고 목록은 그대로다', async () => {
    setMyRole('OWNER');
    server.use(
      http.put('/api/bunches/:bunchId/memberships/:membershipId/role', () =>
        fail(500, 'COMMON_500'),
      ),
    );
    renderMembers();

    await confirmIn('공동 관리자로 지정하기', '완료', '경진');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('처리하지 못했어요. 잠시 후 다시 시도해 주세요.'),
    );
    expect((await serverRoles())['경진']).toBe('MEMBER');
    expect(await screen.findByRole('button', { name: '경진 관리' })).toBeTruthy();
  });

  it('실패 뒤 목록 다시 받기도 실패하면 관리하지 않고 다시 시도를 보이며, 받으면 목록으로 돌아온다', async () => {
    setMyRole('OWNER');
    let listFails = false;
    server.use(
      http.put('/api/bunches/:bunchId/memberships/:membershipId/role', () =>
        fail(500, 'COMMON_500'),
      ),
      http.get('/api/bunches/:bunchId/memberships', () =>
        listFails ? fail(500, 'COMMON_500') : undefined,
      ),
    );
    const user = userEvent.setup();
    renderMembers();
    await screen.findByText('5/8명');
    listFails = true;

    await confirmIn('공동 관리자로 지정하기', '완료', '경진');

    const retry = await screen.findByRole('button', { name: '다시 시도' });
    listFails = false;
    await user.click(retry);
    expect(await screen.findByRole('button', { name: '경진 관리' })).toBeTruthy();
  });

  it('같은 멱등 키로 다시 보낸 넘기기는 처음 성공 응답을 돌려준다(첫 응답 유실 재시도)', async () => {
    setMyRole('OWNER');
    const base = { actorMembershipId: String(MOCK_MY_MEMBER_ID), expectedMembershipVersion: 1 };
    const target = String(MOCK_MEMBER_IDS.memberB);

    const first = await transferOwner(String(MOCK_BUNCH_ID), target, base, 'k-transfer');
    const replay = await transferOwner(String(MOCK_BUNCH_ID), target, base, 'k-transfer');

    expect(replay.membershipVersion).toBe(first.membershipVersion);
    expect((await serverRoles())['은우']).toBe('OWNER');
  });

  it('메인 관리자가 공동 관리자로 지정하면 서버에 반영하고 토스트를 띄운다', async () => {
    setMyRole('OWNER');
    renderMembers();

    await confirmIn('공동 관리자로 지정하기', '완료', '경진');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('경진님이 공동 관리자가 되었어요.', { icon: 'success' }),
    );
    expect((await serverRoles())['경진']).toBe('CO_OWNER');
  });

  it('내보내면 목록과 인원에서 빠진다', async () => {
    setMyRole('OWNER');
    renderMembers();

    await confirmIn('번치에서 내보내기', '내보내기', '수인');

    expect(await screen.findByText('4/8명')).toBeTruthy();
    expect(rows().some((row) => row.includes('수인'))).toBe(false);
    expect(toast).toHaveBeenCalledWith('수인님을 번치에서 내보냈어요.', { icon: 'success' });
  });

  it('관리자 권한을 넘기면 나는 일반 멤버가 되어 관리 메뉴가 사라진다', async () => {
    setMyRole('OWNER');
    renderMembers();

    await confirmIn('관리자 권한 넘기기', '완료', '은우');

    await waitFor(() => expect(screen.queryAllByRole('button', { name: /관리$/ })).toHaveLength(0));
    expect((await serverRoles())['은우']).toBe('OWNER');
    expect((await serverRoles())['큐시즘']).toBe('MEMBER');
  });

  it('공동 관리자는 메인 관리자를 뺀 멤버를 내보내기만 할 수 있다', async () => {
    setMyRole('CO_OWNER');
    const user = userEvent.setup();
    renderMembers();

    expect(await screen.findByRole('button', { name: '경진 관리' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '지예 관리' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '경진 관리' }));
    const menu = await screen.findByRole('alertdialog', { name: /경진/ });
    expect(
      within(menu)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toContain('번치에서 내보내기');
    expect(within(menu).queryByRole('button', { name: '관리자 권한 넘기기' })).toBeNull();
  });

  it('그 사이 다른 곳에서 멤버가 바뀌어 거절되면 최신 목록으로 다시 불러오고 알린다', async () => {
    setMyRole('OWNER');
    renderMembers();
    await screen.findByText('5/8명');
    // 목록을 받은 뒤 다른 관리자가 한 명을 내보냄
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) => !(item.bunchId === MOCK_BUNCH_ID && item.memberId === MOCK_MEMBER_IDS.memberC),
      ),
      bunches: state.bunches.map((bunch) =>
        bunch.id === MOCK_BUNCH_ID ? { ...bunch, membershipVersion: 2 } : bunch,
      ),
    }));

    await confirmIn('공동 관리자로 지정하기', '완료', '경진');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('멤버 정보가 바뀌어 최신 목록으로 다시 불러왔어요.'),
    );
    expect(await screen.findByText('4/8명')).toBeTruthy();
    expect(toast).not.toHaveBeenCalledWith('경진님이 공동 관리자가 되었어요.', { icon: 'success' });
    expect((await serverRoles())['경진']).toBe('MEMBER');
  });
});
