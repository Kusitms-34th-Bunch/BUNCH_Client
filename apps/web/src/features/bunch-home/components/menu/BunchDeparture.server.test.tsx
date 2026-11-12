import type * as DesignSystem from '@app/design-system';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberRole } from '@/mocks/db/types';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { BunchDelete } from './BunchDelete';
import { BunchLeave } from './BunchLeave';
import { BunchMenu } from './BunchMenu';

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});
// 단언이 실패해도 다음 테스트로 listener·spy가 넘어가지 않게
afterEach(() => {
  vi.restoreAllMocks();
  server.events.removeAllListeners();
});

// 처리 뒤 기본 번치 갱신이 화면에 반영될 시간을 줌(고정하지 않았다면 이 사이에 다음 번치로 바뀜)
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 100)));

// 시연 회원(큐시즘)의 기본 번치(여행쥬아) 역할을 바꿈. 메인 관리자로 만들면 원래 메인 관리자(지예)는 일반 멤버
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
const renderWithQuery = (ui: React.ReactElement) =>
  render(ui, { wrapper: createQueryWrapper(createTestQueryClient()) });
// 들어온 길만큼 기록을 쌓아 「돌아갈 기록이 있음」 상태로 둠
const stackHistory = (count: number) => {
  for (let i = 0; i < count; i += 1) window.history.pushState({}, '', `/step-${i}`);
};
const myMembership = (bunchId = MOCK_BUNCH_ID) =>
  mockDb
    .get()
    .memberships.find((item) => item.bunchId === bunchId && item.memberId === MOCK_MY_MEMBER_ID);

describe('BunchMenu 서버 나가기', () => {
  it('기본 번치의 내 역할로 메뉴를 보여 준다', async () => {
    renderWithQuery(<BunchMenu />);

    await screen.findByRole('button', { name: '번치 나가기' });
    expect(screen.getAllByRole('listitem').map((item) => item.textContent?.trim())).toEqual([
      '멤버 관리',
      '멤버 초대',
      '차단 목록',
      '번치 나가기',
    ]);
  });

  it('돌아갈 기록이 없으면 뒤로 가기가 번치 홈으로 바꾼다', async () => {
    const user = userEvent.setup();
    renderWithQuery(<BunchMenu />);

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.home);
  });

  it('나가기를 확인하면 서버에서 나간 뒤 번치 탭으로 돌아가 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    stackHistory(1);
    renderWithQuery(<BunchMenu />);

    await user.click(await screen.findByRole('button', { name: '번치 나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '나가기' }));

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.left('여행쥬아'));
    expect(myMembership()).toBeUndefined();
    await settle();
    // 나가는 동안 다음 기본 번치(퇴근런클럽)로 화면을 바꾸지 않음
    expect(replace).not.toHaveBeenCalled();
  });

  it('나가지 못하면 안내하고 그 자리에 남는다', async () => {
    server.use(http.post('/api/bunches/:bunchId/leave', () => fail(500, 'COMMON_500')));
    const user = userEvent.setup();
    renderWithQuery(<BunchMenu />);

    await user.click(await screen.findByRole('button', { name: '번치 나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '나가기' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.leaveFailed));
    expect(back).not.toHaveBeenCalled();
    expect(myMembership()).toBeDefined();
  });
  it('실패 뒤 같은 나가기를 다시 보내면 같은 멱등 키를 쓴다(응답만 못 받은 경우 처음 응답을 받게)', async () => {
    server.use(
      http.post('/api/bunches/:bunchId/leave', () => fail(500, 'COMMON_500'), { once: true }),
    );
    const keys: (string | null)[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/leave')) keys.push(request.headers.get('Idempotency-Key'));
    });
    const user = userEvent.setup();
    stackHistory(1);
    renderWithQuery(<BunchMenu />);
    const leave = async () => {
      await user.click(await screen.findByRole('button', { name: '번치 나가기' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: '나가기' }));
    };

    await leave();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.leaveFailed));
    await leave();

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });
});

describe('BunchLeave 서버 메인 관리자 나가기', () => {
  it('새 관리자를 지정하고 나가면 그 멤버가 메인 관리자가 되고 두 칸 뒤로 돌아간다', async () => {
    setMyRole('OWNER');
    const user = userEvent.setup();
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    stackHistory(2);
    renderWithQuery(<BunchLeave />);

    // 후보는 나를 뺀 이름순
    await screen.findByRole('radio', { name: '경진' });
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    await user.click(screen.getByRole('radio', { name: '수인' }));
    await user.click(screen.getByRole('button', { name: '관리자로 지정하기' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: '지정하고 나가기' }));

    await waitFor(() => expect(go).toHaveBeenCalledWith(-2));
    expect(toastAfterNavigation).toHaveBeenCalledWith(
      BUNCH_HOME_MESSAGES.transferredAndLeft('수인'),
    );
    expect(myMembership()).toBeUndefined();
    expect(
      mockDb
        .get()
        .memberships.find(
          (item) => item.bunchId === MOCK_BUNCH_ID && item.memberId === MOCK_MEMBER_IDS.memberC,
        )?.role,
    ).toBe('OWNER');
    await settle();
    expect(replace).not.toHaveBeenCalled();
  });

  it('메인 관리자가 아니면 더보기 메뉴로 돌려보낸다', async () => {
    renderWithQuery(<BunchLeave />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.menu));
  });
});

describe('BunchDelete 서버 삭제', () => {
  it('메인 관리자가 아니면 더보기 메뉴로 돌려보낸다', async () => {
    renderWithQuery(<BunchDelete step="info" />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.menu));
  });

  it('안내의 「다음」은 확인 문구 입력 화면으로 간다', async () => {
    setMyRole('OWNER');
    renderWithQuery(<BunchDelete step="info" />);

    await userEvent.click(await screen.findByRole('button', { name: '다음' }));

    expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.deleteConfirm);
  });

  it('소속 멤버는 나를 맨 앞에 「(나)」로 보여 준다', async () => {
    setMyRole('OWNER');
    renderWithQuery(<BunchDelete step="confirm" />);

    expect(await screen.findByText(/^큐시즘\(나\), /)).toBeInTheDocument();
  });

  it('확인 문구를 넣고 삭제하면 한 번만 보내고 세 칸 뒤로 돌아가 토스트를 띄운다', async () => {
    setMyRole('OWNER');
    const requests = vi.fn();
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/deletion')) requests();
    });
    const user = userEvent.setup();
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    stackHistory(3);
    renderWithQuery(<BunchDelete step="confirm" />);

    // 처리 중의 Enter 반복·연타
    await user.type(
      await screen.findByRole('textbox', { name: '확인 문구 입력' }),
      '삭제하기{Enter}{Enter}',
    );
    await user.click(screen.getByRole('button', { name: '삭제하기' }));

    await waitFor(() => expect(go).toHaveBeenCalledWith(-3));
    expect(go).toHaveBeenCalledTimes(1);
    expect(requests).toHaveBeenCalledTimes(1);
    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.deleted('여행쥬아'));
    expect(mockDb.get().bunches.some((bunch) => bunch.id === MOCK_BUNCH_ID)).toBe(false);
    await settle();
    // 빠지는 화면은 다음 번치가 아니라 삭제한 번치를 그대로 보여 줌
    expect(screen.getByText('여행쥬아')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('삭제하지 못하면 안내하고 그 자리에 남는다', async () => {
    setMyRole('OWNER');
    server.use(http.post('/api/bunches/:bunchId/deletion', () => fail(500, 'COMMON_500')));
    const user = userEvent.setup();
    renderWithQuery(<BunchDelete step="confirm" />);

    await user.type(
      await screen.findByRole('textbox', { name: '확인 문구 입력' }),
      '삭제하기{Enter}',
    );

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.deleteFailed));
    expect(mockDb.get().bunches.some((bunch) => bunch.id === MOCK_BUNCH_ID)).toBe(true);
  });
});
