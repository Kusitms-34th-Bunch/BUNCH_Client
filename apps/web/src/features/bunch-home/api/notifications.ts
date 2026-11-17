import { bffApi, requestData } from '@/shared/api/bffApi';
import {
  notificationOpenSchema,
  notificationPageSchema,
  notificationUnreadSchema,
} from '../model/notifications';

const notificationsPath = (bunchId: string) =>
  `bunches/${encodeURIComponent(bunchId)}/notifications`;

// 목록은 첫 쪽만(더 불러오기는 UT 이후, 팔로우 목록과 같은 기준)
const LIST_PAGE_SIZE = 50;

/** 번치의 알림 첫 쪽(최신순)과 읽지 않은 수 */
export const getBunchNotifications = (bunchId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(notificationsPath(bunchId), {
      searchParams: { page: 0, size: LIST_PAGE_SIZE },
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
