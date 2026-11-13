import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { formatElapsedTime } from '@/shared/lib/elapsedTime';
import type { BunchNotification } from '../lib/types';
import { BUNCH_HOME_PATHS } from '../constants/paths';

type Schemas = components['schemas'];

/** 알림을 눌렀을 때 갈 화면(Swagger `NotificationTarget`). 알 수 없는 종류는 번치 홈 */
const notificationTargetSchema = z.object({
  kind: z.string(),
  bunchId: z.number().int().positive(),
  bundleId: z.number().int().positive().nullish(),
  noticeId: z.number().int().positive().nullish(),
  targetBunchId: z.number().int().positive().nullish(),
  sourceBunchId: z.number().int().positive().nullish(),
  commentId: z.number().int().positive().nullish(),
});
type NotificationTarget = z.infer<typeof notificationTargetSchema>;

// 알림 종류(type)·이동 종류(kind)는 서버가 늘릴 수 있어 문자열로 받고(enum이면 파싱 실패), 생성 타입과는 묶지 않음
const notificationItemSchema = z.object({
  id: z.number().int().positive(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullish(),
  target: notificationTargetSchema,
});

/** `GET /bunches/{bunchId}/notifications` 응답(최신순 쪽) */
export const notificationPageSchema = z.object({
  items: z.array(notificationItemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationPage = z.infer<typeof notificationPageSchema>;

/** `POST .../{notificationId}/open` 응답. available이 false면 갈 화면이 없어짐(삭제된 번들 등) */
export const notificationOpenSchema = z.object({
  notificationId: z.number().int().positive(),
  readAt: z.string(),
  available: z.boolean(),
  target: notificationTargetSchema.nullish(),
});

/** `POST .../read-all` 응답 */
export const notificationUnreadSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
}) satisfies z.ZodType<ApiContract<Schemas['NotificationUnread']>>;

export const toBunchNotifications = (
  page: NotificationPage,
  now: number = Date.now(),
): BunchNotification[] =>
  page.items.map((item) => ({
    id: toDomainId(item.id),
    title: item.title,
    description: item.body,
    time: formatElapsedTime(item.createdAt, now),
    unread: !item.readAt,
  }));

// 번들 상세는 feed feature 화면이라 URL 계약만 둠(feature import 없음)
const bundlePath = (bundleId: number) => `/bundles/${toDomainId(bundleId)}`;

/**
 * 알림 이동 화면(기능명세 5.12.3 표의 이동 화면). 화면이 아직 없거나 필요한 ID가 없으면 번치 홈
 * ponytail: 「작성 중인 번들」 탭·추천 번들 시트를 바로 여는 주소가 없어 번치 홈·번들 만들기 시작으로 보냄
 */
export const notificationPath = (target: NotificationTarget): string => {
  switch (target.kind) {
    case 'MEMBERS':
      return BUNCH_HOME_PATHS.members;
    case 'ROLE_PERMISSIONS':
      return BUNCH_HOME_PATHS.roles;
    case 'DRAFT':
      return target.bundleId
        ? BUNCH_HOME_PATHS.draft(toDomainId(target.bundleId))
        : BUNCH_HOME_PATHS.home;
    case 'BUNDLE':
      return target.bundleId ? bundlePath(target.bundleId) : BUNCH_HOME_PATHS.home;
    case 'BUNDLE_COMMENTS':
      return target.bundleId
        ? `${bundlePath(target.bundleId)}?focus=comments`
        : BUNCH_HOME_PATHS.home;
    case 'CANDIDATES':
      return BUNCH_HOME_PATHS.createBundle;
    case 'OTHER_BUNCH_PROFILE':
      return target.targetBunchId
        ? BUNCH_HOME_PATHS.otherBunch(toDomainId(target.targetBunchId))
        : BUNCH_HOME_PATHS.home;
    default:
      // BUNCH_HOME, DRAFT_LIST, ACCESS_NOTICE
      return BUNCH_HOME_PATHS.home;
  }
};
