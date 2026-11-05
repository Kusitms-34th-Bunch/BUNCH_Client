'use client';

import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { ToggleListItem } from '@app/design-system/web';
import { useId, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import {
  NOTIFICATION_TYPES,
  type DeviceNotificationPermission,
  type NotificationSettings,
} from '../../lib/types';
import { DeviceNotificationOffBanner } from './DeviceNotificationOffBanner';

type NotificationSettingsScreenProps = {
  /** 지금 저장된 설정(알림 설정 API 연결 전에는 fixture) */
  settings: NotificationSettings;
  /** 기기 알림 권한. 꺼져 있으면 배너를 띄우고 토글을 모두 막음 */
  devicePermission: DeviceNotificationPermission;
  /** 기기 알림 설정 열기(앱 연동 전에는 없음) */
  onOpenDeviceSettings?: (() => void) | undefined;
};

/**
 * 알림 설정(화면 설계서 MY(3)): 앱 푸시 전체 토글과 알림 종류별 토글, 바꾸면 바로 반영(저장 API 연결 전이라 화면 상태만)
 * 전체를 끄거나 기기 권한이 꺼지면 종류별 값은 그대로 보여 주며 막고, 다시 켜면 그 값으로 돌아옴
 */
export function NotificationSettingsScreen({
  settings,
  devicePermission,
  onOpenDeviceSettings,
}: NotificationSettingsScreenProps) {
  const backOr = useBackOr();
  const typesLabelId = useId();
  const deviceOffMessageId = useId();
  const [push, setPush] = useState(settings.push);
  const [types, setTypes] = useState(settings.types);

  const deviceOff = devicePermission === 'denied';
  const typesDisabled = deviceOff || !push;
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
          title={text.push.title}
          description={text.push.description}
          checked={push}
          disabled={deviceOff}
          aria-describedby={disabledReason}
          onChange={(event) => setPush(event.currentTarget.checked)}
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
                checked={types[type]}
                disabled={typesDisabled}
                aria-describedby={disabledReason}
                onChange={(event) => {
                  const { checked } = event.currentTarget;
                  setTypes((prev) => ({ ...prev, [type]: checked }));
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
