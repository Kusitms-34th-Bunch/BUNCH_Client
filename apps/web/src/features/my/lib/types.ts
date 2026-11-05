import type { Gender } from '@/shared/components/profile/GenderField';

export type MyProfile = {
  nickname: string;
  /** 프로필 이미지 주소(없으면 배경색 원) */
  imageSrc?: string | undefined;
  /** 출생연도 4자리(입력하지 않았으면 없음) */
  birthYear?: number | undefined;
  gender?: Gender | undefined;
};

/** 알림 종류(화면 설계서 MY(3) 3번 「받을 알림」 순서) */
export const NOTIFICATION_TYPES = ['bundle', 'growth', 'member', 'follow', 'reaction'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationSettings = {
  /** 앱 푸시 전체 수신(끄면 종류별 값은 유지한 채 모두 받지 않음) */
  push: boolean;
  types: Record<NotificationType, boolean>;
};

/** 기기의 BUNCH 알림 권한 */
export type DeviceNotificationPermission = 'granted' | 'denied';
