import type { NotificationSettings, NotificationType } from './types';

/** 서버 푸시 수신 설정(`GET·PATCH /members/me/push-preferences`)의 화면 밖 모양: 전체 수신과 카테고리별 수신 */
export type PushPreferences = { enabled: boolean; types: Record<string, boolean> };

/** 서버에 보내는 부분 수정. 보내지 않은 값은 서버가 유지함 */
export type PushPreferencePatch = { enabled?: boolean; types?: Record<string, boolean> };

/**
 * 화면 토글과 서버 카테고리(서버 V35, 기능명세서 7.3.3). 서버가 21개 알림 종류 키를 4개 카테고리로 바꿈(옛 키는 400 `COMMON_001`)
 * 내보내짐·번치 삭제·번치 공개 범위 바뀜은 카테고리가 없어 앱 푸시가 켜져 있으면 항상 보냄
 */
export const NOTIFICATION_CATEGORY_KEYS = {
  bundle: 'BUNDLE_NEWS',
  member: 'MEMBER_ROLE',
  follow: 'FOLLOW',
  reaction: 'REACTION',
} as const satisfies Record<NotificationType, string>;

/** 서버 설정을 화면 토글로. 서버가 키를 주지 않으면 기본값(켜짐)으로 봄(저장값이 없으면 모두 true) */
export const toNotificationSettings = ({
  enabled,
  types,
}: PushPreferences): NotificationSettings => {
  const isOn = (type: NotificationType) => types[NOTIFICATION_CATEGORY_KEYS[type]] ?? true;
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

/** 알림 종류 토글을 누른 변경: 그 카테고리만 보냄(다른 카테고리와 전체 값은 건드리지 않음) */
export const typePatch = (type: NotificationType, checked: boolean): PushPreferencePatch => ({
  types: { [NOTIFICATION_CATEGORY_KEYS[type]]: checked },
});

/** 서버 응답이 오기 전에 화면을 먼저 바꾸기 위해 변경을 지금 설정에 적용한 값(서버가 하는 병합과 같은 규칙) */
export const applyPreferencePatch = (
  current: PushPreferences,
  patch: PushPreferencePatch,
): PushPreferences => ({
  enabled: patch.enabled ?? current.enabled,
  types: { ...current.types, ...patch.types },
});
