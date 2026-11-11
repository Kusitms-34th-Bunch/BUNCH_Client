'use client';

import type { PermissionKind } from '@app/bridge';
import { useRef, useState } from 'react';
import { isNativeShell, permissionBridge } from '@/shared/bridge/client';

// 기획: 사진 접근 → 카메라 → 알림 순서로 시스템 권한 팝업 호출
const PERMISSION_ORDER: PermissionKind[] = ['photo', 'camera', 'notification'];

// 팝업은 사용자가 응답할 때까지 기다리되, 응답이 없어도 가입이 멈추지 않게 권한마다 상한 적용
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
 * 약관 화면에서 시스템 권한을 순서대로 한 번만 요청(전체 동의를 체크할 때, 거치지 않았으면 시작하기 뒤)
 * 허용·거부·실패와 상관없이 다음 권한으로 넘어가고 끝까지 마친 뒤 반환(거부해도 가입은 계속)
 * 다시 부르면 진행 중이거나 끝난 같은 요청을 돌려줌: 전체 동의로 시작된 팝업이 끝나기 전에 시작하기를 눌러도 기다린 뒤 이동
 * 이미 정해진 권한은 OS가 팝업 없이 현재 상태를 돌려주고(iOS), 네이티브 쉘이 아니거나 쉘이 오래돼 요청을 지원하지 않으면 생략
 * 응답이 없으면 권한마다 `PERMISSION_RESPONSE_TIMEOUT_MS` 뒤에 다음 권한으로 진행
 */
export function usePermissionRequests() {
  const [isRequesting, setIsRequesting] = useState(false);
  // 같은 틱의 연타도 같은 요청을 받도록 ref에 둠(state는 다음 렌더에야 반영)
  const request = useRef<Promise<void> | null>(null);

  const run = async () => {
    if (!isNativeShell() || !permissionBridge.isNativeMethodAvailable('requestPermission')) return;
    setIsRequesting(true);
    try {
      for (const kind of PERMISSION_ORDER) {
        // 한 권한이 실패하거나 응답이 없어도 다음 권한과 가입 흐름은 계속 진행
        await withTimeout(permissionBridge.requestPermission(kind));
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const requestAll = () => {
    request.current ??= run();
    return request.current;
  };

  return { isRequesting, requestAll };
}
