'use client';

import { type ComponentType, useEffect, useState, type ReactNode } from 'react';

/**
 * `NEXT_PUBLIC_API_MOCKING=enabled` 빌드에서만 가짜 서버를 켜고 준비된 뒤 화면 렌더(준비 전 첫 요청의 실제 BFF 유출 방지)
 * 조건이 빌드 시점에 확정돼 꺼진 빌드는 ./browser(MSW)가 번들에서 제외
 * webpack은 조기 return 뒤 코드는 제외하지 않아 `=== 'enabled'` 블록 안에 import 유지 필요
 */
export function ApiMockingGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled');
  // UT 진행자 장치(가짜 서버를 켠 빌드에서만 불러옴, 참여자 화면에는 보이지 않음)
  const [Facilitator, setFacilitator] = useState<ComponentType | undefined>(undefined);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      let active = true;
      void import('./browser')
        .then(({ startApiMocking }) => startApiMocking())
        .then(() => import('./scenario/FacilitatorTool'))
        .then(({ FacilitatorTool }) => {
          if (active) setFacilitator(() => FacilitatorTool);
        })
        .catch((error: unknown) => {
          // 서비스 워커를 쓸 수 없는 환경에서도 화면 렌더(요청은 실제 BFF로 나가 오류 노출)
          console.error('[mocks] 가짜 서버 시작 실패', error);
        })
        .finally(() => {
          if (active) setReady(true);
        });
      return () => {
        active = false;
      };
    }
    return undefined;
  }, []);

  return ready ? (
    <>
      {children}
      {Facilitator ? <Facilitator /> : null}
    </>
  ) : null;
}
