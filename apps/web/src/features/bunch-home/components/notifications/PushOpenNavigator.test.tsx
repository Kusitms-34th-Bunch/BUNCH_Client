import type { PushOpen } from '@app/bridge';
import { render, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { PushOpenNavigator } from './PushOpenNavigator';

const push = vi.fn();
const toast = vi.fn<(_message: string) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: (message: string) => toast(message),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

type BridgeMock = {
  takeOpenedPush: ReturnType<typeof vi.fn<(_tab: string | null) => Promise<unknown>>>;
  tab: string | null;
  listeners: Map<string, () => void>;
};
const bridge = vi.hoisted((): BridgeMock => ({
  takeOpenedPush: vi.fn<(_tab: string | null) => Promise<unknown>>(),
  tab: 'bunch',
  listeners: new Map<string, () => void>(),
}));
vi.mock('@/shared/bridge/client', () => ({
  appBridge: {
    takeOpenedPush: bridge.takeOpenedPush,
    addEventListener: (name: string, listener: () => void) => {
      bridge.listeners.set(name, listener);
      return () => bridge.listeners.delete(name);
    },
  },
  hasNativeMethod: () => true,
  nativeShellTab: () => bridge.tab,
  openTabPath: (href: string, go: (_href: string) => void) => go(href),
}));

const opened = (target: PushOpen['target'], notificationId: number | null = 5): PushOpen => ({
  target,
  notificationId,
});

const renderNavigator = () =>
  render(<PushOpenNavigator />, { wrapper: createQueryWrapper(createTestQueryClient()) });
// 쉘 알림 구독은 프로필을 받아 로그인이 확인된 뒤에 생김(그때 처음 가져가기도 시도함)
const signedInReady = () => waitFor(() => expect(bridge.listeners.has('pushOpened')).toBe(true));

describe('PushOpenNavigator', () => {
  const openCalls: string[] = [];
  beforeEach(() => {
    openCalls.length = 0;
    server.use(
      http.post('/api/bunches/:bunchId/notifications/:notificationId/open', ({ params }) => {
        openCalls.push(`${String(params.bunchId)}/${String(params.notificationId)}`);
        return undefined;
      }),
    );
  });
  afterEach(() => {
    push.mockReset();
    toast.mockReset();
    bridge.tab = 'bunch';
    bridge.takeOpenedPush.mockReset();
    bridge.listeners.clear();
  });

  it('지금 번치의 댓글 알림이면 그 댓글로 가고 수신함 번치로 읽음 처리한다', async () => {
    bridge.takeOpenedPush.mockResolvedValue(
      opened({ kind: 'BUNDLE_COMMENTS', bunchId: MOCK_BUNCH_ID, bundleId: 7, commentId: 9 }),
    );
    renderNavigator();

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        `/bunches/${MOCK_BUNCH_ID}/bundles/7?section=comments&comment=9&via=push`,
      ),
    );
    expect(bridge.takeOpenedPush).toHaveBeenCalledWith('bunch');
    await waitFor(() => expect(openCalls).toEqual([`${MOCK_BUNCH_ID}/5`]));
  });

  it('다른 내 번치의 알림이면 그 번치로 바꾼 뒤 지금 번치 기준 화면으로 간다', async () => {
    const switched: string[] = [];
    server.use(
      http.put('/api/bunches/:id/last-used', ({ params }) => {
        switched.push(String(params.id));
        return undefined;
      }),
    );
    bridge.takeOpenedPush.mockResolvedValue(
      opened({ kind: 'MEMBERS', bunchId: MOCK_SECOND_BUNCH_ID }),
    );
    renderNavigator();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/bunch/members'));
    expect(switched).toEqual([String(MOCK_SECOND_BUNCH_ID)]);
    await waitFor(() => expect(openCalls).toEqual([`${MOCK_SECOND_BUNCH_ID}/5`]));
  });

  it('수신함 없는 푸시(내보내짐·삭제)는 번치를 바꾸지 않고 읽음 처리도 하지 않는다', async () => {
    const switched: string[] = [];
    server.use(
      http.put('/api/bunches/:id/last-used', () => {
        switched.push('called');
        return undefined;
      }),
    );
    bridge.takeOpenedPush.mockResolvedValue(
      opened({ kind: 'ACCESS_NOTICE', bunchId: MOCK_SECOND_BUNCH_ID }, null),
    );
    renderNavigator();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/bunch'));
    expect(switched).toEqual([]);
    expect(openCalls).toEqual([]);
  });

  it('번치 전환에 실패하면 이동·읽음 처리 없이 바로 오류 토스트를 띄운다', async () => {
    server.use(http.put('/api/bunches/:id/last-used', () => fail(500, 'COMMON_999')));
    bridge.takeOpenedPush.mockResolvedValue(
      opened({ kind: 'MEMBERS', bunchId: MOCK_SECOND_BUNCH_ID }),
    );
    renderNavigator();

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.switchFailed));
    expect(push).not.toHaveBeenCalled();
    expect(openCalls).toEqual([]);
  });

  it('iOS 쉘의 첫 화면 WebView(탭 ID 없음)는 가져가지 않는다', async () => {
    bridge.tab = null;
    bridge.takeOpenedPush.mockResolvedValue(opened({ kind: 'MEMBERS', bunchId: MOCK_BUNCH_ID }));
    renderNavigator();
    await signedInReady();
    // 가드는 기다리는 일 없이 바로 돌아가 알림 직후에 판정할 수 있음
    bridge.listeners.get('pushOpened')?.();
    expect(bridge.takeOpenedPush).not.toHaveBeenCalled();
  });

  it('잘못된 값이면 이동하지 않고, 쉘이 알리면 다시 가져간다', async () => {
    bridge.takeOpenedPush.mockResolvedValueOnce({ target: { kind: 'BUNDLE', bunchId: -1 } });
    renderNavigator();
    await waitFor(() => expect(bridge.takeOpenedPush).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();

    bridge.takeOpenedPush.mockResolvedValueOnce(
      opened({ kind: 'BUNDLE', bunchId: MOCK_BUNCH_ID, bundleId: 3 }),
    );
    bridge.listeners.get('pushOpened')?.();
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/bunches/${MOCK_BUNCH_ID}/bundles/3`));
  });

  it('화면에 보이지 않는 WebView는 가져가지 않는다', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      bridge.takeOpenedPush.mockResolvedValue(opened({ kind: 'MEMBERS', bunchId: MOCK_BUNCH_ID }));
      renderNavigator();
      await signedInReady();
      bridge.listeners.get('pushOpened')?.();
      expect(bridge.takeOpenedPush).not.toHaveBeenCalled();
    } finally {
      visibility.mockRestore();
    }
  });
});
