'use client';

import { isApiError } from '@app/api-core';
import { ErrorBoundary, Suspense } from '@suspensive/react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { type ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type QueryBoundaryProps = {
  /** 받는 중(서버 렌더와 첫 받기)에 보일 화면 */
  pending: ReactNode;
  /** 받는 중 안내(늘 있는 상태 영역에서 글자만 바꿔 읽어 줌) */
  pendingLabel: string;
  /** 받지 못함. `retry`를 누르면 실패한 query를 다시 받음 */
  failed: (_retry: () => void) => ReactNode;
  children: ReactNode;
};

/**
 * 안쪽 `useSuspenseQuery`의 받는 중·실패를 한곳에서 처리(ADR 022, docs/architecture/data-layer.md 「Query 모드 선택」)
 * 서버 렌더에서는 받는 중만 그림(`clientOnly`, 브라우저 전용 BFF 요청을 서버에서 보내지 않게)
 * API 오류만 잡고 렌더 버그는 위로 올려 오류 수집(`global-error`)까지 가게 함. 이미 받은 데이터가 있으면 다시 받기가 실패해도 보던 내용 유지
 */
export function QueryBoundary({ pending, pendingLabel, failed, children }: QueryBoundaryProps) {
  // 다시 시도하면 실패 화면이 받는 중으로 바뀌어 버튼이 사라지므로 초점을 이 영역에 둠
  const areaRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<HTMLParagraphElement | null>(null);

  return (
    <div ref={areaRef} tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none">
      <p ref={setStatus} role="status" className="sr-only" />
      {/* 다시 시도 표시를 이 경계 안의 query로만 좁힘 */}
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            shouldCatch={isApiError}
            onReset={reset}
            fallback={({ reset: retry }) =>
              failed(() => {
                areaRef.current?.focus({ preventScroll: true });
                retry();
              })
            }
          >
            <Suspense
              clientOnly
              fallback={
                <>
                  {/* 받는 중인 동안만 상태 영역에 글자가 생김 */}
                  {status ? createPortal(pendingLabel, status) : null}
                  {pending}
                </>
              }
            >
              {children}
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}
