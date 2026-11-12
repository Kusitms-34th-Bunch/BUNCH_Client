'use client';

import { cn } from '@app/design-system';
import { useRef, type ReactNode } from 'react';
import { RefreshSpark } from '@/shared/components/refresh/RefreshSpark';
import { usePullToRefresh } from '@/shared/hooks/usePullToRefresh';

const REFRESH_STATUS_MESSAGES = {
  idle: '',
  refreshing: '새로고침하고 있어요',
  done: '새로고침을 마쳤어요',
} as const;

type PageShellProps = {
  /** 상단 고정 영역(요소·동작은 화면이 결정) */
  header?: ReactNode;
  /** 하단 고정 영역(내비게이션·CTA) */
  bottom?: ReactNode;
  /** 바깥 틀에 더하는 class. 배경색이 흰색이 아닌 화면은 여기서 `bg-*`로 변경 */
  className?: string;
  /**
   * 있으면 본문을 맨 위에서 아래로 당겨 새로고침(Figma `6673:45282`). 끝날 때까지 기다릴 수 있게 Promise를 돌려줌
   * 터치로만 동작하며, 화면이 진입·앱 복귀 때도 새로 받는다는 전제의 보조 수단
   */
  onRefresh?: (() => Promise<unknown> | void) | undefined;
  /** 선택 모드·저장 중처럼 당김이 다른 조작과 겹치는 동안 끔 */
  refreshDisabled?: boolean | undefined;
  /** Safe Area까지 이어질 배경 표식(AppFrame에서 처리) */
  'data-app-background'?:
    | 'brand-subtle-1'
    // 앱 첫 실행 인트로의 브랜드 장면
    | 'brand'
    | 'secondary'
    // 번치 성격별 홈 배경(TYPE_2~4, TYPE_1은 brand-subtle-1)
    | 'orange-50'
    | 'pink-50'
    | 'green-50'
    | undefined;
  /** 아래 Safe Area만 다른 색일 때(위는 data-app-background, 아래 내용은 흰색인 화면) */
  'data-app-background-bottom'?: 'primary' | undefined;
  children: ReactNode;
};

/** 본문 스크롤 영역. `scrollbar-none`: 앱처럼 스크롤바를 그리지 않음(globals.css) */
const MAIN_CLASS =
  'min-h-32 flex-1 scroll-pb-(--main-tab-bar-height,0px) scrollbar-none overflow-y-auto overscroll-y-contain pb-(--main-tab-bar-scroll-inset,0px)';

/**
 * 헤더·본문·하단 슬롯 배치와 본문 스크롤 담당. 본문 좌우 패딩·Safe Area는 다루지 않음
 * `<main>`은 이 셸만 생성(화면당 PageShell 1회, 중첩 금지)
 */
export function PageShell({
  header,
  bottom,
  className,
  onRefresh,
  refreshDisabled,
  children,
  'data-app-background': appBackground,
  'data-app-background-bottom': appBackgroundBottom,
}: PageShellProps) {
  const refreshContainerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { status } = usePullToRefresh({
    containerRef: refreshContainerRef,
    scrollRef: mainRef,
    onRefresh,
    disabled: refreshDisabled,
  });

  // min-h-32: 낮은 화면(가로 모드·큰 글꼴)의 본문 0 방지 — 상세는 docs/architecture/mobile-shell.md
  // pb: 하단 탭 막대가 떠 있는 화면은 스크롤 끝 사진과 막대 사이 간격 확보(변수가 없으면 0)
  // scroll-pb: 하단 탭 막대가 본문 위에 떠 있는 화면에서 키보드 포커스 요소가 막대 밑으로 가려지지 않도록 (변수가 없으면 0)
  // overscroll-y-contain: WebView 바운스·브라우저 기본 새로고침 전파 방지(당겨서 새로고침은 onRefresh가 직접 처리)
  const main = (
    <main ref={mainRef} className={MAIN_CLASS}>
      {children}
    </main>
  );

  return (
    <div
      data-app-background={appBackground}
      data-app-background-bottom={appBackgroundBottom}
      className={cn('bg-surface-primary flex min-h-0 flex-1 flex-col', className)}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      {onRefresh ? (
        // 내용(`main`의 직계 자식)과 표시기가 `--pull-y`·`--pull-p`를 받아 움직임(globals.css `.pull-refresh`)
        <div
          ref={refreshContainerRef}
          className="pull-refresh group/pull relative isolate flex min-h-32 flex-1 flex-col"
        >
          <div aria-hidden className="pull-refresh-indicator">
            <RefreshSpark />
          </div>
          {/* 새로고침 중·끝남을 스크린 리더에 알림(항상 마운트해 문구만 바꿈) */}
          <p role="status" className="sr-only">
            {REFRESH_STATUS_MESSAGES[status]}
          </p>
          {main}
        </div>
      ) : (
        main
      )}
      {/* data-toast-anchor: toast()가 이 영역 위 4px에 토스트를 놓음(디자인 시스템 Toast spec) */}
      {bottom ? (
        <div data-toast-anchor="wrapper" className="shrink-0">
          {bottom}
        </div>
      ) : null}
    </div>
  );
}
