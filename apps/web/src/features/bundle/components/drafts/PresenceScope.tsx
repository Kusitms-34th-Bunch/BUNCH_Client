'use client';

import { type ReactNode, useEffect } from 'react';
import type { PresenceCommands } from '../../hooks/usePresenceSender';

type PresenceScopeProps = {
  presence: PresenceCommands;
  /** 작업 중으로 알릴 영역(예: `DATE`, `PHOTOS`) */
  target: string;
  children?: ReactNode;
};

/**
 * 이 컴포넌트가 화면에 있는 동안 그 영역을 작업 중으로 알림(시트·모달·화면이 열려 있는 동안)
 * 닫히거나 사라지면 그 target의 작업만 끝내 다른 진행 작업은 유지함
 */
export function PresenceScope({ presence, target, children }: PresenceScopeProps) {
  useEffect(() => {
    presence.begin(target);
    return () => presence.end(target);
  }, [presence, target]);
  return children;
}
