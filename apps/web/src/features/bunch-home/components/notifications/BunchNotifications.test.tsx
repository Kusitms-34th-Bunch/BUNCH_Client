import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
// 알림 container는 가짜 서버 응답에 기댐(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BunchHomeHeader } from '../BunchHomeHeader';
import { BunchNotifications } from './BunchNotifications';
import { BunchNotificationsScreen } from './BunchNotificationsScreen';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BunchNotificationsScreen', () => {
  it('목록을 아직 모르면 로딩을 알리고 「모두 읽음」을 눌러도 읽음 처리를 하지 않는다', async () => {
    const onReadAll = vi.fn(() => Promise.resolve());
    render(
      <BunchNotificationsScreen
        bunchName={undefined}
        notifications={undefined}
        hasUnread={false}
        onBack={vi.fn()}
        onReadAll={onReadAll}
        onOpen={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '모두 읽음' }));

    expect(onReadAll).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(BUNCH_HOME_MESSAGES.notificationsLoading);
  });
});

describe('알림 입구', () => {
  it('번치 홈 헤더의 「알림」은 알림 목록으로 가는 링크다', () => {
    render(
      <BunchHomeHeader
        bunchName="여행가조"
        onBunchClick={vi.fn()}
        switcherOpen={false}
        className="bg-surface-brand-subtle-1"
      />,
    );

    expect(screen.getByRole('link', { name: '알림' })).toHaveAttribute(
      'href',
      '/bunch/notifications',
    );
  });
});

// 시작 데이터: 여행쥬아(내 기본 번치) 알림 4개(앞 3개 읽지 않음, 마지막은 지워진 번들), 퇴근런클럽 읽지 않음 1개
const renderList = () =>
  render(<BunchNotifications />, { wrapper: createQueryWrapper(createTestQueryClient()) });
const cards = async () => within(await screen.findByRole('list')).getAllByRole('button');
const unreadOf = (bunchId: number) =>
  mockDb.get().notifications.filter((item) => item.bunchId === bunchId && !item.readAt).length;

describe('BunchNotifications(가짜 서버)', () => {
  it('지금 번치의 알림을 최신순으로 보여 주고 읽지 않은 알림을 알린다', async () => {
    renderList();

    const list = await cards();
    expect(screen.getByRole('heading', { level: 1, name: '여행쥬아 알림' })).toBeInTheDocument();
    expect(list).toHaveLength(4);
    expect(list[0]).toHaveAccessibleName(expect.stringContaining('새로운 번들 후보가 생겼어요'));
    list
      .slice(0, 3)
      .forEach((card) => expect(card).toHaveAccessibleName(expect.stringContaining('읽지 않음')));
    expect(list[3]).not.toHaveAccessibleName(expect.stringContaining('읽지 않음'));
  });

  it('알림을 누르면 서버에서 읽음이 되고 알림 종류의 화면으로 간다', async () => {
    const user = userEvent.setup();
    renderList();

    const [, bundle] = await cards();
    await user.click(bundle!);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/bundles/1'));
    expect(unreadOf(MOCK_BUNCH_ID)).toBe(2);
    await waitFor(async () =>
      expect((await cards())[1]).not.toHaveAccessibleName(expect.stringContaining('읽지 않음')),
    );
  });

  it('갈 화면이 사라진 알림은 이동하지 않고 볼 수 없다고 알린다', async () => {
    const user = userEvent.setup();
    renderList();

    const list = await cards();
    await user.click(list[3]!);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.notificationUnavailable),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('알림 열기에 실패하면 이동하지 않고 실패를 알린다', async () => {
    server.use(
      http.post('/api/bunches/:bunchId/notifications/:notificationId/open', () => fail(500, 'X')),
    );
    const user = userEvent.setup();
    renderList();

    await user.click((await cards())[0]!);

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.readFailed));
    expect(push).not.toHaveBeenCalled();
  });

  it('「모두 읽음」은 지금 번치의 알림만 서버에서 읽음으로 바꾸고 결과를 알린다', async () => {
    const user = userEvent.setup();
    renderList();
    await cards();

    const readAll = screen.getByRole('button', { name: '모두 읽음' });
    await user.click(readAll);

    // 초점은 버튼에 남고 결과는 상태 영역으로 읽힘
    expect(await screen.findByText(BUNCH_HOME_MESSAGES.readAllDone)).toHaveAttribute(
      'role',
      'status',
    );
    expect(readAll).toHaveFocus();
    expect(unreadOf(MOCK_BUNCH_ID)).toBe(0);
    expect(unreadOf(MOCK_SECOND_BUNCH_ID)).toBe(1);
    const after = await cards();
    after.forEach((card) =>
      expect(card).not.toHaveAccessibleName(expect.stringContaining('읽지 않음')),
    );
  });

  it('모두 읽음 뒤 다시 받기가 실패해도 받은 목록을 읽음으로 바꾸고 결과를 알린다', async () => {
    const user = userEvent.setup();
    renderList();
    await cards();
    server.use(http.get('/api/bunches/:bunchId/notifications', () => fail(500, 'X')));

    await user.click(screen.getByRole('button', { name: '모두 읽음' }));

    expect(await screen.findByText(BUNCH_HOME_MESSAGES.readAllDone)).toHaveAttribute(
      'role',
      'status',
    );
    const after = await cards();
    after.forEach((card) =>
      expect(card).not.toHaveAccessibleName(expect.stringContaining('읽지 않음')),
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it('읽을 알림이 없으면 요청하지 않고 없다고 알린다', async () => {
    mockDb.update((state) => ({
      ...state,
      notifications: state.notifications.map((item) => ({ ...item, readAt: item.createdAt })),
    }));
    const requests: string[] = [];
    onTestFinished(() => server.events.removeAllListeners());
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') requests.push(new URL(request.url).pathname);
    });
    const user = userEvent.setup();
    renderList();
    await cards();

    await user.click(screen.getByRole('button', { name: '모두 읽음' }));

    expect(await screen.findByText(BUNCH_HOME_MESSAGES.nothingToRead)).toHaveAttribute(
      'role',
      'status',
    );
    expect(requests).toEqual([]);
  });

  it('알림이 하나도 없으면 없다고 알린다', async () => {
    mockDb.update((state) => ({ ...state, notifications: [] }));
    renderList();

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(BUNCH_HOME_MESSAGES.noNotifications),
    );
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('목록을 처음부터 못 받으면 다시 시도 화면을 보인다', async () => {
    server.use(http.get('/api/bunches/:bunchId/notifications', () => fail(500, 'X')));
    renderList();

    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('뒤로 가기는 기록이 있으면 되돌아가고, 없으면 번치 홈으로 간다', async () => {
    const user = userEvent.setup();
    renderList();
    const length = vi.spyOn(window.history, 'length', 'get');

    length.mockReturnValue(1);
    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(replace).toHaveBeenCalledWith('/bunch');

    length.mockReturnValue(3);
    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(back).toHaveBeenCalledTimes(1);
    length.mockRestore();
  });
});
