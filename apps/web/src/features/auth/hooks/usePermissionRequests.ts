'use client';

import type { PermissionKind } from '@app/bridge';
import { useRef, useState } from 'react';
import { isNativeShell, permissionBridge } from '@/shared/bridge/client';

// 기획: 사진 접근 → 카메라 → 알림 순서로 시스템 권한 팝업을 호출한다
const PERMISSION_ORDER: PermissionKind[] = ['photo', 'camera', 'notification'];

// 팝업은 사용자가 응답할 때까지 기다리지만, 응답이 오지 않아도 가입이 멈추지 않게 권한마다 상한을 둔다
export const PERMISSION_RESPONSE_TIMEOUT_MS = 60_000;

const withTimeout = (request: Promise<unknown>) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, PERMISSION_RESPONSE_TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    request.then(done, done);
  });

/**
 * 약관 동의 뒤 시스템 권한을 순서대로 요청
 * 허용·거부·실패와 상관없이 다음 권한으로 넘어가고 끝까지 마친 뒤 돌아온다(거부해도 가입은 계속)
 * 이미 정해진 권한은 OS가 팝업 없이 현재 상태를 돌려주고(iOS), 네이티브 쉘이 아니거나 쉘이 오래돼 요청을 지원하지 않으면 건너뛴다
 * 응답이 없으면 권한마다 `PERMISSION_RESPONSE_TIMEOUT_MS` 뒤에 다음으로 넘어간다
 */
export function usePermissionRequests() {
  const [isRequesting, setIsRequesting] = useState(false);
  // state는 다음 렌더에야 바뀌어 같은 틱의 연타를 막지 못해 ref로 먼저 잠근다
  const inFlight = useRef(false);

  const requestAll = async () => {
    if (inFlight.current) return;
    if (!isNativeShell() || !permissionBridge.isNativeMethodAvailable('requestPermission')) return;
    inFlight.current = true;
    setIsRequesting(true);
    try {
      for (const kind of PERMISSION_ORDER) {
        // 한 권한이 실패하거나 응답이 없어도 다음 권한과 가입 흐름은 계속한다
        await withTimeout(permissionBridge.requestPermission(kind));
      }
    } finally {
      inFlight.current = false;
      setIsRequesting(false);
    }
  };

  return { isRequesting, requestAll };
}
