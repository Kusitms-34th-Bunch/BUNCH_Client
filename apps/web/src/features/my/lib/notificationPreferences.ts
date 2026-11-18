import type { NotificationSettings, NotificationType } from './types';

/** 서버 푸시 수신 설정(`GET·PATCH /members/me/push-preferences`)의 화면 밖 모양: 전체 수신과 알림 종류별 키 */
export type PushPreferences = { enabled: boolean; types: Record<string, boolean> };

/** 서버에 보내는 부분 수정. 보내지 않은 값은 서버가 유지함 */
export type PushPreferencePatch = { enabled?: boolean; types?: Record<string, boolean> };

/**
 * 화면 토글 하나가 묶는 서버 알림 종류(기능명세서 7.3.3 로직 1, 5.12.3 번호 순)
 * 내보내짐(14)·번치 삭제(15)·번치 공개 범위 바뀜(16)은 어느 토글에도 묶지 않고 앱 푸시가 켜져 있으면 항상 보내므로 여기에 없음
 * 뭉치 성장(9, `CHARACTER_GROWN`)은 뭉치 알림이 기획에서 제외돼 토글이 없으므로 여기에 없음(보내지 않음, 5.12.3 9번 삭제)
 * 답글 알림(22)은 서버에서 따로 키가 없고 댓글 알림(`SOCIAL_COMMENT_CREATED`)에 포함됨
 */
export const NOTIFICATION_TYPE_KEYS = {
  bundle: [
    'DRAFT_PARTICIPANT_ADDED',
    'DRAFT_ACTIVITY',
    'COMMENT_REMINDER',
    'DRAFT_PARTICIPANT_REMOVED',
    'DRAFT_READY_TO_PUBLISH',
    'DRAFT_PARTICIPANTS_INSUFFICIENT',
    'BUNDLE_PUBLISHED',
    'CANDIDATE_CREATED',
  ],
  member: ['MEMBER_JOINED', 'CO_OWNER_GRANTED', 'CO_OWNER_REVOKED', 'OWNER_TRANSFERRED'],
  follow: ['BUNCH_FOLLOWED', 'FOLLOW_REQUESTED', 'FOLLOW_REQUEST_APPROVED'],
  reaction: ['SOCIAL_COMMENT_CREATED', 'BUNDLE_LIKED'],
} as const satisfies Record<NotificationType, readonly string[]>;

/**
 * 서버 설정을 화면 토글로: 묶인 알림이 모두 켜져 있을 때만 켜짐으로 보임
 * 서버가 키를 주지 않으면 기본값(켜짐)으로 봄(저장값이 없으면 모두 true, Notion 푸시 수신 설정 조회)
 */
export const toNotificationSettings = ({
  enabled,
  types,
}: PushPreferences): NotificationSettings => {
  const isOn = (type: NotificationType) =>
    NOTIFICATION_TYPE_KEYS[type].every((key) => types[key] ?? true);
  return {
    push: enabled,
    types: {
      bundle: isOn('bundle'),
      member: isOn('member'),
      follow: isOn('follow'),
      reaction: isOn('reaction'),
    },
  };
};

/** 앱 푸시 전체 토글을 누른 변경 */
export const pushPatch = (enabled: boolean): PushPreferencePatch => ({ enabled });

/** 알림 종류 토글을 누른 변경: 묶인 키를 모두 같은 값으로 보냄(다른 종류와 전체 값은 건드리지 않음) */
export const typePatch = (type: NotificationType, checked: boolean): PushPreferencePatch => ({
  types: Object.fromEntries(NOTIFICATION_TYPE_KEYS[type].map((key) => [key, checked])),
});

/** 서버 응답이 오기 전에 화면을 먼저 바꾸기 위해 변경을 지금 설정에 적용한 값(서버가 하는 병합과 같은 규칙) */
export const applyPreferencePatch = (
  current: PushPreferences,
  patch: PushPreferencePatch,
): PushPreferences => ({
  enabled: patch.enabled ?? current.enabled,
  types: { ...current.types, ...patch.types },
});
