'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import type { DeviceNotificationPermission } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { useDeviceNotificationPermission } from '../../hooks/useDeviceNotificationPermission';
import { pushPatch, toNotificationSettings, typePatch } from '../../lib/notificationPreferences';
import {
  notificationSettingsQueryOptions,
  useUpdateNotificationSettingsMutation,
} from '../../queries/notifications';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';

/**
 * 알림 설정과 푸시 수신 설정 API·기기 알림 권한을 잇는 컨테이너
 * 설정값을 받을 때까지 전체 로딩, 받지 못하면 이전 화면으로 돌아가 그 화면에서 오류 토스트를 보임(기능명세서 7.3.1 예외)
 */
export function NotificationSettingsRoute() {
  const backOr = useBackOr();
  const query = useQuery(notificationSettingsQueryOptions());
  const update = useUpdateNotificationSettingsMutation();
  const { permission, ready, checking, openSettings } = useDeviceNotificationPermission();
  const failed = query.isError && !query.data && query.fetchStatus === 'idle';
  const text = MY_MESSAGES.notifications;
  // 영역이 먼저 마운트된 뒤에 문구를 채워야 스크린 리더가 변화로 읽음(영역과 문구가 함께 생기면 읽히지 않을 수 있음)
  const [mounted, setMounted] = useState(false);
  // 기기 알림 권한이 화면에 머무는 중 바뀌면 배너가 생기거나 사라지므로 변화를 낭독으로 알림(처음 값은 알리지 않음)
  const [permissionNotice, setPermissionNotice] = useState('');
  // 권한을 처음 확인한 값(변화 안내의 기준). 쉘에서 첫 상태를 받기 전의 초기값은 기준으로 쓰지 않음
  const baselinePermission = useRef<DeviceNotificationPermission | null>(null);
  // backOr는 렌더마다 새로 만들어지므로 한 번만 돌아가도록 막음
  const left = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (baselinePermission.current === null) {
      baselinePermission.current = permission;
      return;
    }
    if (baselinePermission.current === permission) return;
    baselinePermission.current = permission;
    setPermissionNotice(permission === 'denied' ? text.deviceOffAnnounce : text.deviceOnAnnounce);
  }, [ready, permission, text.deviceOffAnnounce, text.deviceOnAnnounce]);

  useEffect(() => {
    if (!failed || left.current) return;
    left.current = true;
    toastAfterNavigation(MY_MESSAGES.notifications.loadFailed);
    backOr(MY_PATHS.home);
  }, [failed, backOr]);

  return (
    <>
      {/* 불러오는 중임을 스크린 리더에 알림(PageLoading은 안내를 호출하는 쪽에 맡김) */}
      <p role="status" className="sr-only">
        {mounted && query.isPending ? text.loading : ''}
      </p>
      <p role="status" className="sr-only">
        {permissionNotice}
      </p>
      {query.data ? (
        <NotificationSettingsScreen
          settings={toNotificationSettings(query.data)}
          devicePermission={permission}
          devicePermissionChecking={checking}
          onChangePush={(checked) => update.mutate(pushPatch(checked))}
          onChangeType={(type, checked) => update.mutate(typePatch(type, checked))}
          onOpenDeviceSettings={openSettings}
        />
      ) : query.isPending ? (
        <PageLoading />
      ) : null}
    </>
  );
}
