'use client';

import { permissionStatusSchema } from '@app/bridge';
import { useCallback, useEffect, useState } from 'react';
import { isNativeShell, permissionBridge, photoUploadBridge } from '@/shared/bridge/client';
import type { DeviceNotificationPermission } from '../lib/types';

// 쉘이 bridge 메서드 목록을 알려 주기 전에는 지원 여부를 알 수 없어 짧게 몇 번 다시 확인
const READY_RETRY_MS = 300;
const READY_RETRY_LIMIT = 10;
// 첫 상태를 받기 전 토글을 막아 두는 최대 시간. 지나면 쉘이 읽기를 지원하지 않는 것으로 보고 풀어 오래된 쉘이 오래 막히지 않게 함
const CHECK_CAP_MS = 1000;

/**
 * 기기의 BUNCH 알림 권한(기능명세서 7.3.4). 상태만 읽고 OS 권한 창은 띄우지 않음
 * 화면에 들어올 때와 앱으로 돌아올 때(탭이 다시 보이거나 창이 포커스를 받을 때) 다시 확인함
 * 거부(`denied`)만 꺼짐으로 보고, 아직 정하지 않았거나 읽을 수 없으면(브라우저·오래된 쉘·오류) 켜짐으로 두어 배너로 막지 않음
 * `checking`은 쉘에서 첫 상태를 받기 전(최대 `CHECK_CAP_MS`)이라 권한이 꺼져 있는지 아직 모르는 구간. 화면이 그동안 토글을 잠가 거부된 기기에서 설정이 바뀌지 않게 함
 * `ready`는 쉘에서 첫 상태를 받았는지(읽을 필요가 없는 브라우저는 처음부터 true). 첫 값은 변화가 아니라 처음 상태라 변화 안내의 기준으로만 씀
 * 겹쳐 보낸 읽기는 마지막 요청의 응답만 반영함(앞선 요청의 낡은 값이 나중에 도착해도 덮지 않음)
 * 「설정으로 이동」은 쉘에서만 줌(브라우저에는 앱 설정이 없음)
 */
export function useDeviceNotificationPermission() {
  const [permission, setPermission] = useState<DeviceNotificationPermission>('granted');
  const [ready, setReady] = useState(() => !isNativeShell());
  const [checking, setChecking] = useState(() => isNativeShell());

  useEffect(() => {
    if (!isNativeShell()) return;
    let cancelled = false;
    let latest = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // 읽기가 끝나지 않아도 상한이 지나면 풀어 줌(읽기를 지원하지 않는 오래된 쉘)
    const capTimer = setTimeout(() => setChecking(false), CHECK_CAP_MS);

    const refresh = (attempt = 0) => {
      if (!permissionBridge.isNativeMethodAvailable('getPermissionStatus')) {
        if (attempt < READY_RETRY_LIMIT) {
          retryTimer = setTimeout(() => refresh(attempt + 1), READY_RETRY_MS);
        }
        return;
      }
      latest += 1;
      const request = latest;
      permissionBridge.getPermissionStatus('notification').then(
        (status) => {
          if (cancelled || request !== latest) return;
          // 쉘 응답을 그대로 믿지 않고 상태 3종으로 검증(예상 밖 값은 정하지 않음으로 봄)
          const checked = permissionStatusSchema.catch('undetermined').parse(status);
          setPermission(checked === 'denied' ? 'denied' : 'granted');
          setReady(true);
          setChecking(false);
        },
        // 읽지 못해도 계속 막지 않음(켜짐으로 둠)
        () => setChecking(false),
      );
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearTimeout(capTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  const openSettings = useCallback(() => {
    void photoUploadBridge.openAppSettings().catch(() => undefined);
  }, []);

  return { permission, ready, checking, openSettings: isNativeShell() ? openSettings : undefined };
}
