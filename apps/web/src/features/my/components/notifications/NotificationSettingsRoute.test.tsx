import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUSH_NOTIFICATION_TYPES } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { NotificationSettingsRoute } from './NotificationSettingsRoute';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

const replace = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, back }) }));
// 토스트 표시는 DS의 `toast()` 담당이라 호출만 차단
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

const device = vi.hoisted((): { permission: 'granted' | 'denied'; checking: boolean } => ({
  permission: 'granted',
  checking: false,
}));
vi.mock('../../hooks/useDeviceNotificationPermission', () => ({
  useDeviceNotificationPermission: () => ({
    permission: device.permission,
    ready: true,
    checking: device.checking,
    openSettings: undefined,
  }),
}));

const ALL_KEYS: readonly string[] = PUSH_NOTIFICATION_TYPES;

/** 응답 시점을 test가 정하는 대기(시간 지연에 기대지 않고 순서를 결정적으로 만듦) */
const deferred = () => {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

type Prefs = { enabled: boolean; categories: Record<string, boolean> };
const server_ = { prefs: null as unknown as Prefs, patches: [] as unknown[], gets: 0 };

/** 서버처럼 부분 수정을 병합해 돌려주는 handler. `failPatch`면 저장을 실패시킴 */
const useServer = (
  initial: Partial<Prefs> = {},
  {
    failPatch = false,
    failFirst = 0,
    gate,
  }: { failPatch?: boolean; failFirst?: number; gate?: Promise<void> } = {},
) => {
  server_.prefs = {
    enabled: initial.enabled ?? true,
    categories: {
      ...Object.fromEntries(ALL_KEYS.map((key) => [key, true])),
      ...initial.categories,
    },
  };
  server_.patches = [];
  server_.gets = 0;
  server.use(
    http.get('/api/members/me/push-preferences', () => {
      server_.gets += 1;
      return ok(server_.prefs);
    }),
    http.patch('/api/members/me/push-preferences', async ({ request }) => {
      const body = (await request.json()) as Partial<Prefs>;
      server_.patches.push(body);
      if (server_.patches.length <= failFirst) {
        // 뒤에 누른 요청과 겹치도록 test가 풀어 줄 때까지 실패 응답을 미룸
        await gate;
        return fail(500, 'COMMON_500');
      }
      if (failPatch) return fail(500, 'COMMON_500');
      server_.prefs = {
        enabled: body.enabled ?? server_.prefs.enabled,
        categories: { ...server_.prefs.categories, ...body.categories },
      };
      return ok(server_.prefs);
    }),
  );
};

const toggle = (name: string) => screen.getByRole<HTMLInputElement>('switch', { name });
const renderRoute = (client = createTestQueryClient()) =>
  render(<NotificationSettingsRoute />, { wrapper: createQueryWrapper(client) });
const ready = () => screen.findByRole('switch', { name: '앱 푸시 알림' });

beforeEach(() => {
  vi.clearAllMocks();
  device.permission = 'granted';
  device.checking = false;
});

describe('NotificationSettingsRoute', () => {
  it('서버 설정을 받아 토글 4개로 보여 준다(묶인 알림이 하나라도 꺼져 있으면 꺼짐)', async () => {
    useServer({ enabled: true, categories: { BUNDLE_LIKED: false, DRAFT_ACTIVITY: false } });

    renderRoute();
    await ready();

    expect(toggle('번들 소식').checked).toBe(false);
    expect(toggle('멤버 및 권한 소식').checked).toBe(true);
    expect(toggle('팔로우').checked).toBe(true);
    expect(toggle('좋아요 및 댓글').checked).toBe(false);
    expect(toggle('앱 푸시 알림').checked).toBe(true);
  });

  it('받는 동안 스크린 리더에 안내하고, 받으면 안내를 지운다', async () => {
    useServer();
    // 응답을 test가 풀어 줄 때까지 미뤄 로딩 안내가 보이는 구간을 결정적으로 만듦
    const gate = deferred();
    server.use(
      http.get('/api/members/me/push-preferences', async () => {
        await gate.promise;
        return ok(server_.prefs);
      }),
    );

    renderRoute();

    // 영역이 먼저 마운트된 뒤 문구가 채워짐(영역과 문구가 함께 생기면 읽히지 않을 수 있음)
    expect(await screen.findByText('알림 설정을 불러오는 중이에요')).toBeTruthy();
    gate.release();
    await ready();
    await waitFor(() => expect(screen.queryByText('알림 설정을 불러오는 중이에요')).toBeNull());
  });

  it('종류 토글을 누르면 바로 바뀌고, 묶인 키를 모두 같은 값으로 저장한다', async () => {
    useServer();
    renderRoute();
    await ready();

    await userEvent.click(toggle('팔로우'));

    await waitFor(() => expect(toggle('팔로우').checked).toBe(false));
    await waitFor(() => expect(server_.patches).toHaveLength(1));
    expect(server_.patches[0]).toEqual({
      categories: {
        BUNCH_FOLLOWED: false,
        FOLLOW_REQUESTED: false,
        FOLLOW_REQUEST_APPROVED: false,
      },
    });
    // 다른 종류와 전체는 그대로
    expect(toggle('번들 소식').checked).toBe(true);
    expect(toggle('앱 푸시 알림').checked).toBe(true);
  });

  it('앱 푸시 전체 토글은 enabled만 저장하고 종류별 값은 지우지 않는다', async () => {
    useServer();
    renderRoute();
    await ready();

    await userEvent.click(toggle('앱 푸시 알림'));

    await waitFor(() => expect(server_.patches).toHaveLength(1));
    expect(server_.patches[0]).toEqual({ enabled: false });
    await waitFor(() => expect(toggle('앱 푸시 알림').checked).toBe(false));
    expect(toggle('번들 소식').checked).toBe(true);
  });

  it('받을 알림 4개를 모두 꺼도 앱 푸시 알림은 켜진 채로 두고 전체 수신을 바꾸는 요청도 없다', async () => {
    useServer();
    renderRoute();
    await ready();

    for (const title of ['번들 소식', '멤버 및 권한 소식', '팔로우', '좋아요 및 댓글']) {
      await userEvent.click(toggle(title));
    }

    await waitFor(() => expect(server_.patches).toHaveLength(4));
    expect(toggle('앱 푸시 알림').checked).toBe(true);
    expect(server_.patches.every((patch) => !('enabled' in (patch as object)))).toBe(true);
  });

  it('토글이 없는 알림(9·14~16번) 키는 어떤 요청에도 보내지 않는다', async () => {
    useServer();
    renderRoute();
    await ready();

    for (const title of ['번들 소식', '멤버 및 권한 소식', '팔로우', '좋아요 및 댓글']) {
      await userEvent.click(toggle(title));
    }
    await waitFor(() => expect(server_.patches).toHaveLength(4));

    const sent = server_.patches.flatMap((patch) =>
      Object.keys((patch as Partial<Prefs>).categories ?? {}),
    );
    for (const key of [
      'CHARACTER_GROWN',
      'MEMBER_REMOVED',
      'BUNCH_DELETED',
      'BUNCH_VISIBILITY_CHANGED',
    ]) {
      expect(sent).not.toContain(key);
    }
  });

  it('저장에 실패하면 토글을 원래대로 돌리고 오류 토스트를 띄운다', async () => {
    useServer({}, { failPatch: true });
    renderRoute();
    await ready();

    await userEvent.click(toggle('팔로우'));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    await waitFor(() => expect(toggle('팔로우').checked).toBe(true));
  });

  it('연타하면 누른 순서대로 저장해 서버에 마지막 값이 남는다', async () => {
    useServer();
    renderRoute();
    await ready();

    const follow = toggle('팔로우');
    await userEvent.click(follow);
    await userEvent.click(follow);
    await userEvent.click(follow);

    await waitFor(() => expect(server_.patches).toHaveLength(3));
    const values = server_.patches.map((patch) => (patch as Prefs).categories.BUNCH_FOLLOWED);
    expect(values).toEqual([false, true, false]);
    expect(server_.prefs.categories.BUNCH_FOLLOWED).toBe(false);
    await waitFor(() => expect(toggle('팔로우').checked).toBe(false));
  });

  it('기기 알림 권한을 확인하는 동안에는 배너 없이 토글만 잠그고, 확인이 끝나면 풀어 저장한다', async () => {
    device.checking = true;
    useServer();
    const { rerender } = renderRoute();
    await ready();

    expect(toggle('앱 푸시 알림').disabled).toBe(true);
    expect(toggle('팔로우').disabled).toBe(true);
    expect(screen.queryByText('알림 설정이 꺼져 있어요.')).toBeNull();
    await userEvent.click(toggle('팔로우'));
    expect(server_.patches).toHaveLength(0);

    device.checking = false;
    rerender(<NotificationSettingsRoute />);
    expect(toggle('팔로우').disabled).toBe(false);
    await userEvent.click(toggle('팔로우'));
    await waitFor(() => expect(server_.patches).toHaveLength(1));
  });

  it('기기 알림 권한이 꺼져 있으면 배너를 띄우고 토글을 막는다', async () => {
    device.permission = 'denied';
    useServer();

    renderRoute();
    await ready();

    expect(screen.getByText('알림 설정이 꺼져 있어요.')).toBeTruthy();
    expect(toggle('앱 푸시 알림').disabled).toBe(true);
  });

  it('연타 중 앞선 저장이 실패해도 뒤에 누른 값이 남고 서버 값을 따로 다시 받지 않는다', async () => {
    const gate = deferred();
    useServer({}, { failFirst: 1, gate: gate.promise });
    const client = createTestQueryClient();
    renderRoute(client);
    await ready();
    const getsAfterLoad = server_.gets;

    // 첫 저장이 서버 응답을 기다리는 동안 한 번 더 누름(끄기 → 켜기)
    const follow = toggle('팔로우');
    await userEvent.click(follow);
    await userEvent.click(follow);
    gate.release();

    await waitFor(() => expect(server_.patches).toHaveLength(2));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    // 두 번째 저장(켜기)이 서버에 반영돼 화면도 켜짐으로 남음
    await waitFor(() => expect(toggle('팔로우').checked).toBe(true));
    expect(server_.prefs.categories.BUNCH_FOLLOWED).toBe(true);
    // 저장 후처리와 재조회까지 모두 끝난 것을 query client로 확인한 뒤(고정 대기 없이), 첫 저장 실패 때문에 서버 값을 따로 다시 받지 않았는지 확인
    // 뒤 저장과 겹쳐 낡은 값이 덮는 것을 막기 위한 동작
    await waitFor(() => {
      expect(client.isMutating()).toBe(0);
      expect(client.isFetching()).toBe(0);
    });
    expect(server_.gets).toBe(getsAfterLoad);
  });

  it('기기 알림 권한이 머무는 중 바뀌면 낭독으로 알리고, 처음 값은 알리지 않는다', async () => {
    useServer();
    const { rerender } = renderRoute();
    await ready();
    expect(screen.queryByText(/기기 알림이/)).toBeNull();

    device.permission = 'denied';
    rerender(<NotificationSettingsRoute />);
    expect(
      await screen.findByText('기기 알림이 꺼져 있어 알림 설정을 바꿀 수 없어요'),
    ).toBeTruthy();

    device.permission = 'granted';
    rerender(<NotificationSettingsRoute />);
    expect(await screen.findByText('기기 알림이 켜져서 알림 설정을 바꿀 수 있어요')).toBeTruthy();
  });

  it('처음부터 기기 알림 권한이 꺼져 있으면 배너만 보이고 변화 낭독은 없다', async () => {
    device.permission = 'denied';
    useServer();

    renderRoute();
    await ready();

    expect(screen.getByText('알림 설정이 꺼져 있어요.')).toBeTruthy();
    expect(screen.queryByText('기기 알림이 꺼져 있어 알림 설정을 바꿀 수 없어요')).toBeNull();
  });

  it('설정을 불러오지 못하면 이전 화면으로 돌아가고 오류 토스트는 도착 화면에서 보이게 예약한다', async () => {
    server.use(http.get('/api/members/me/push-preferences', () => fail(500, 'COMMON_500')));

    renderRoute();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my'));
    expect(toastAfterNavigation).toHaveBeenCalledWith(
      '일시적인 오류가 발생했어요. 다시 시도해 주세요',
    );
    expect(toast).not.toHaveBeenCalled();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
