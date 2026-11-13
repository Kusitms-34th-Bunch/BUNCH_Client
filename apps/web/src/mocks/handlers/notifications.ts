import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockDbState, MockNotification } from '../db/types';
import { mockDb } from '../db';
import { fail, ok } from '../lib/envelope';
import { isMine, paged, pageOf } from './follows';

// 번치 알림(Swagger). 명세에 오류 코드가 없어 권한은 AUTH_002, 잘못된 입력은 COMMON_001, 없는 알림은 RESOURCE_001

/** 번치의 읽지 않은 알림 수(번치 홈·내 번치 목록의 unreadCount) */
export const unreadCountOf = (state: MockDbState, bunchId: number) =>
  state.notifications.filter((item) => item.bunchId === bunchId && !item.readAt).length;

const toItem = ({ bunchId: _bunchId, ...item }: MockNotification) => item;

// ponytail: 갈 화면이 남아 있는지는 번들만 확인(멤버·번치 프로필 대상은 늘 열 수 있다고 봄)
const availableOf = (state: MockDbState, target: MockNotification['target']) =>
  target.bundleId === undefined || state.bundles.some((bundle) => bundle.id === target.bundleId);

/** 경로의 내 번치. 내가 속한 번치가 아니면 403 */
const bunchOf = (params: Record<string, string | readonly string[] | undefined>) => {
  const bunchId = toWireId(params.bunchId);
  if (bunchId === undefined) return { error: fail(400, 'COMMON_001') };
  const state = mockDb.get();
  if (!isMine(state, bunchId)) return { error: fail(403, 'AUTH_002') };
  return { bunchId, state };
};

/** 알림 하나를 읽음으로 바꾸고 바뀐 알림을 돌려줌(이미 읽었으면 그대로) */
const markRead = (params: Record<string, string | readonly string[] | undefined>) => {
  const found = bunchOf(params);
  if ('error' in found) return { error: found.error };
  const id = toWireId(params.notificationId);
  const notification = found.state.notifications.find(
    (item) => item.id === id && item.bunchId === found.bunchId,
  );
  if (!notification) return { error: fail(404, 'RESOURCE_001') };
  const readAt = notification.readAt ?? new Date().toISOString();
  mockDb.update((state) => ({
    ...state,
    notifications: state.notifications.map((item) =>
      item.id === notification.id ? { ...item, readAt } : item,
    ),
  }));
  return { notification: { ...notification, readAt }, state: found.state };
};

export const notificationHandlers = [
  // GET /api/v1/bunches/{bunchId}/notifications?page=&size=: 최신순 쪽 + 읽지 않은 수
  http.get('/api/bunches/:bunchId/notifications', ({ params, request }) => {
    const page = pageOf(request);
    if (!page) return fail(400, 'COMMON_001');
    const found = bunchOf(params);
    if ('error' in found) return found.error;
    const { bunchId, state } = found;
    const items = state.notifications
      .filter((item) => item.bunchId === bunchId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .map(toItem);
    return ok({ ...paged(items, page), unreadCount: unreadCountOf(state, bunchId) });
  }),

  // POST /api/v1/bunches/{bunchId}/notifications/{notificationId}/open: 읽음 + 갈 화면
  http.post('/api/bunches/:bunchId/notifications/:notificationId/open', ({ params }) => {
    const result = markRead(params);
    if ('error' in result) return result.error;
    const { notification, state } = result;
    const available = availableOf(state, notification.target);
    return ok({
      notificationId: notification.id,
      readAt: notification.readAt,
      available,
      target: available ? notification.target : null,
    });
  }),

  // POST /api/v1/bunches/{bunchId}/notifications/read-all
  http.post('/api/bunches/:bunchId/notifications/read-all', ({ params }) => {
    const found = bunchOf(params);
    if ('error' in found) return found.error;
    const readAt = new Date().toISOString();
    mockDb.update((state) => ({
      ...state,
      notifications: state.notifications.map((item) =>
        item.bunchId === found.bunchId && !item.readAt ? { ...item, readAt } : item,
      ),
    }));
    return ok({ unreadCount: 0 });
  }),
];
