'use client';

import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { ToggleListItem } from '@app/design-system/web';
import { useId } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import {
  NOTIFICATION_TYPES,
  type DeviceNotificationPermission,
  type NotificationSettings,
  type NotificationType,
} from '../../lib/types';
import { DeviceNotificationOffBanner } from './DeviceNotificationOffBanner';

type NotificationSettingsScreenProps = {
  /** 지금 저장된 설정(저장 중인 변경은 이미 반영된 값) */
  settings: NotificationSettings;
  /** 기기 알림 권한. 꺼져 있으면 배너를 띄우고 토글을 모두 막음 */
  devicePermission: DeviceNotificationPermission;
  /** 앱 푸시 전체 토글을 누를 때 */
  onChangePush: (_checked: boolean) => void;
  /** 알림 종류 토글을 누를 때 */
  onChangeType: (_type: NotificationType, _checked: boolean) => void;
  /** 기기 알림 설정 열기(앱이 아니면 없음) */
  onOpenDeviceSettings?: (() => void) | undefined;
};

/**
 * 알림 설정(화면 설계서 MY(3)): 앱 푸시 전체 토글과 알림 종류별 토글. 누르면 바로 반영하고 저장은 호출하는 쪽이 맡음
 * 전체를 끄거나 기기 권한이 꺼지면 종류별 값은 그대로 보여 주며 막고, 다시 켜면 그 값으로 돌아옴
 * 받을 알림 4개를 모두 꺼도 앱 푸시 알림은 켜진 채로 둠(기능명세서 1110판 7.3.3 상세 3)
 */
export function NotificationSettingsScreen({
  settings,
  devicePermission,
  onChangePush,
  onChangeType,
  onOpenDeviceSettings,
}: NotificationSettingsScreenProps) {
  const backOr = useBackOr();
  const typesLabelId = useId();
  const deviceOffMessageId = useId();
  const pushId = useId();

  const deviceOff = devicePermission === 'denied';
  const typesDisabled = deviceOff || !settings.push;
  // 기기 권한 때문에 막힌 토글은 배너 문구를 이유로 함께 읽음
  const disabledReason = deviceOff ? deviceOffMessageId : undefined;
  const text = MY_MESSAGES.notifications;

  return (
    <PageShell
      header={
        <Header
          leading={
            // Figma 헤더 뒤로 가기 아이콘 색(#bcbec2), 개인 프로필 수정과 같은 연한 회색
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={() => backOr(MY_PATHS.home)}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">{text.title}</h1>
      {deviceOff ? (
        <DeviceNotificationOffBanner
          messageId={deviceOffMessageId}
          onOpenSettings={onOpenDeviceSettings}
        />
      ) : null}
      {/* 헤더(또는 배너) 아래 12, 전체 토글과 받을 알림 사이 32(Figma 4096:75318) */}
      <div className="px-padding-p8 pt-padding-p6 gap-s14 flex flex-col">
        <ToggleListItem
          id={pushId}
          title={text.push.title}
          description={text.push.description}
          checked={settings.push}
          disabled={deviceOff}
          aria-describedby={disabledReason}
          onChange={(event) => onChangePush(event.currentTarget.checked)}
        />
        <section aria-labelledby={typesLabelId} className="gap-s3 flex flex-col">
          <h2
            id={typesLabelId}
            className="typography-caption-1-medium text-text-tertiary px-padding-p3"
          >
            {text.typesLabel}
          </h2>
          <div className="gap-s2 flex flex-col">
            {NOTIFICATION_TYPES.map((type) => (
              <ToggleListItem
                key={type}
                title={text.types[type].title}
                description={text.types[type].description}
                checked={settings.types[type]}
                disabled={typesDisabled}
                aria-describedby={disabledReason}
                onChange={(event) => onChangeType(type, event.currentTarget.checked)}
              />
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
