import { bffApi, requestData } from '@/shared/api/bffApi';
import {
  notificationOpenSchema,
  notificationPageSchema,
  notificationUnreadSchema,
} from '../model/notifications';

const notificationsPath = (bunchId: string) =>
  `bunches/${encodeURIComponent(bunchId)}/notifications`;

// 알림 한 쪽 크기(팔로우 목록과 같은 기준)
const LIST_PAGE_SIZE = 50;

/** 번치의 알림 한 쪽(최신순, 0부터)과 읽지 않은 수 */
export const getBunchNotifications = (bunchId: string, page: number, signal?: AbortSignal) =>
  requestData(
    bffApi.get(notificationsPath(bunchId), {
      searchParams: { page, size: LIST_PAGE_SIZE },
      signal: signal ?? null,
    }),
    notificationPageSchema,
    'bunch notifications',
  );

/** 알림 열기: 읽음으로 바꾸고 갈 화면을 받음 */
export const openBunchNotification = (bunchId: string, notificationId: string) =>
  requestData(
    bffApi.post(`${notificationsPath(bunchId)}/${encodeURIComponent(notificationId)}/open`),
    notificationOpenSchema,
    'open notification',
  );

/** 번치의 알림 모두 읽음 */
export const readAllBunchNotifications = (bunchId: string) =>
  requestData(
    bffApi.post(`${notificationsPath(bunchId)}/read-all`),
    notificationUnreadSchema,
    'read all notifications',
  );
