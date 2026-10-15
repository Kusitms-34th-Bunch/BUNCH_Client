import type { ReactNode } from 'react';

type PageShellProps = {
  /** 화면 상단 고정 영역. 헤더 종류와 버튼 동작은 호출하는 화면이 정한다. */
  header?: ReactNode;
  /** 화면 하단 고정 영역(내비게이션, CTA). 없으면 영역을 만들지 않는다. */
  bottom?: ReactNode;
  children: ReactNode;
};

/**
 * 헤더·본문·하단 영역의 순서를 고정하고 본문만 스크롤시킨다. 영역 안의 내용은 전달받은 UI를 그대로 배치한다.
 * 본문 좌우 패딩은 강제하지 않는다. 사진처럼 가장자리까지 펼쳐지는 내용이 있어서 화면이 정한다.
 * Safe Area 여백은 AppFrame이 적용하므로 여기서는 다루지 않는다.
 * `<main>` landmark는 이 셸만 만든다. 화면은 PageShell을 한 번만 쓰고 중첩하지 않는다.
 * header·bottom 영역의 요소는 화면이 정한다: 상단에는 `<header>`, 하단 내비게이션에는 `<nav aria-label>`을 쓴다. 이 셸은 래퍼를 div로만 둬서 landmark가 중복되지 않는다.
 */
export function PageShell({ header, bottom, children }: PageShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header ? <div className="shrink-0">{header}</div> : null}
      {/* min-h-32: 가로 모드·큰 글꼴처럼 높이가 모자라도 본문이 0이 되지 않게 한다. 그보다 낮으면 틀 전체가 넘쳐 페이지가 스크롤된다(이때 하단 영역은 스크롤해야 보이고, main 위에서 스크롤하면 overscroll-y-contain 때문에 문서로 이어지지 않는다. 실기기 확인 대상). */}
      {/* overscroll-y-contain: 본문 끝에서 스크롤이 바깥(WebView 바운스, pull-to-refresh)으로 번지지 않게 한다. 새로고침이 필요한 화면이 생기면 다시 검토한다. */}
      <main className="min-h-32 flex-1 overflow-y-auto overscroll-y-contain">{children}</main>
      {bottom ? <div className="shrink-0">{bottom}</div> : null}
    </div>
  );
}
