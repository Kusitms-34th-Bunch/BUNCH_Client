import type { ReactNode } from 'react';
import { cn } from '@app/design-system';

type PageShellProps = {
  /** 상단 고정 영역(요소·동작은 화면이 결정) */
  header?: ReactNode;
  /** 하단 고정 영역(내비게이션·CTA) */
  bottom?: ReactNode;
  /** 바깥 틀에 더하는 class. 배경색이 흰색이 아닌 화면은 여기서 `bg-*`로 변경 */
  className?: string;
  /** Safe Area까지 이어질 배경 표식(AppFrame에서 처리) */
  'data-app-background'?: 'brand-subtle-1' | undefined;
  children: ReactNode;
};

/**
 * 헤더·본문·하단 슬롯 배치와 본문 스크롤 담당. 본문 좌우 패딩·Safe Area는 다루지 않음
 * `<main>`은 이 셸만 생성(화면당 PageShell 1회, 중첩 금지)
 */
export function PageShell({
  header,
  bottom,
  className,
  children,
  'data-app-background': appBackground,
}: PageShellProps) {
  return (
    <div
      data-app-background={appBackground}
      className={cn('bg-surface-primary flex min-h-0 flex-1 flex-col', className)}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      {/* min-h-32: 낮은 화면(가로 모드·큰 글꼴)의 본문 0 방지 — 상세는 docs/architecture/mobile-shell.md */}
      {/* overscroll-y-contain: WebView 바운스·pull-to-refresh 전파 방지(새로고침 화면에서 재검토) */}
      <main className="min-h-32 flex-1 overflow-y-auto overscroll-y-contain">{children}</main>
      {bottom ? <div className="shrink-0">{bottom}</div> : null}
    </div>
  );
}
