import type { ReactNode } from 'react';

type AppFrameProps = {
  children: ReactNode;
};

/**
 * 일반 화면의 바깥 틀: 폭·중앙 정렬·화면 높이·Safe Area(상하좌우)
 * Safe Area 여백은 여기서만 적용(하위에서 다시 더하면 이중 적용)
 * 배경: 나가는 화면(data-page-leaving)의 표식은 무시하고 화면이 바뀔 때 상태 바·홈 인디케이터 영역도 함께 전환(결정 기록 017)
 * 기본 150ms ease-out(번치 추가 디졸브), 웹 탭 막대가 있으면 탭 크로스페이드와 같은 80ms 등속
 * Next가 새 화면을 그리는 순간 이전 화면이 잠깐 빠져 배경이 먼저 바뀌므로 전환이 시작되기 전부터 transition을 걸어 둠
 * 투명(transparent)은 iOS 쉘이 WebView 뒤에 깐 네이티브 화면(로그인 배경 영상)이 비치게 바탕을 걷음. 흰색이 영상 위로 서서히 빠지지 않게 전환 없이 바로
 * 브랜드(인트로 브랜드 장면)는 배경이 차오르는 시점에 맞춰 200ms 뒤 550ms ease-in-out, 흐려지며 가이드로 넘어갈 때(data-brand-leaving) 350ms
 * sheet 전환 중(data-sheet-moving)에는 시트가 위에 닿는 시점에 맞춰 300ms ease-in-out으로 천천히 변경, 시트가 도착하면(data-sheet-arrived) 바로
 * 아래 Safe Area(쉘에서는 시스템 탭 바 높이 포함)는 따로 그려 화면이 data-app-background-bottom으로 위와 다른 색을 줄 수 있음
 * 탭 화면(웹 data-main-tab-bar·iOS 시스템 data-native-tab-bar)은 높이 0으로 본문을 화면 끝까지 펼침. 탭 막대를 숨긴 선택 모드도 같음(여백은 (main) 레이아웃·막대가 직접 둠)
 * 키보드가 올라오면(화면 또는 KeyboardViewport가 html에 data-keyboard-open 표시) 키보드가 Safe Area를 덮으므로 높이 0
 * 키보드가 떠 있는 동안 높이는 보이는 높이(--keyboard-viewport-height, KeyboardViewport), 그 밖은 100dvh
 * 사진 보기처럼 화면 끝까지 그리는 화면(data-bottom-bleed)도 높이 0. 쉘이 탭 바를 숨기며 아래 여백을 바꿔도 본문 높이가 그대로라 가운데 사진이 밀리지 않음
 */
export function AppFrame({ children }: AppFrameProps) {
  return (
    <div
      data-app-frame
      className="has-[[data-app-background=brand-subtle-1]:not([data-page-leaving],[data-page-leaving]_*)]:bg-surface-brand-subtle-1 has-[[data-app-background=brand]:not([data-page-leaving],[data-page-leaving]_*)]:bg-primitive-gray-800 has-[[data-app-background=secondary]:not([data-page-leaving],[data-page-leaving]_*)]:bg-surface-secondary has-[[data-app-background=orange-50]:not([data-page-leaving],[data-page-leaving]_*)]:bg-primitive-orange-50 has-[[data-app-background=pink-50]:not([data-page-leaving],[data-page-leaving]_*)]:bg-primitive-pink-50 has-[[data-app-background=green-50]:not([data-page-leaving],[data-page-leaving]_*)]:bg-primitive-green-50 bg-surface-primary group/app-frame mx-auto flex h-(--keyboard-viewport-height,100dvh) w-full max-w-(--app-max-width) flex-col pt-(--safe-area-top) pr-(--safe-area-right) pl-(--safe-area-left) has-[[data-app-background=transparent]:not([data-page-leaving],[data-page-leaving]_*)]:bg-transparent motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out motion-safe:has-data-main-tab-bar:duration-80 motion-safe:has-data-main-tab-bar:ease-linear motion-safe:has-data-sheet-arrived:duration-0! motion-safe:has-data-sheet-moving:duration-300! motion-safe:has-data-sheet-moving:ease-in-out! motion-safe:has-[[data-app-background=brand]:not([data-page-leaving],[data-page-leaving]_*)]:delay-200 motion-safe:has-[[data-app-background=brand]:not([data-page-leaving],[data-page-leaving]_*)]:duration-550 motion-safe:has-[[data-app-background=brand]:not([data-page-leaving],[data-page-leaving]_*)]:ease-in-out motion-safe:has-[[data-app-background=transparent]:not([data-page-leaving],[data-page-leaving]_*)]:duration-0 motion-safe:has-[[data-brand-leaving]:not([data-page-leaving],[data-page-leaving]_*)]:duration-350 motion-safe:has-[[data-brand-leaving]:not([data-page-leaving],[data-page-leaving]_*)]:ease-[cubic-bezier(0.45,0,0.55,1)] [&:has([data-bottom-bleed]:not([data-page-leaving]))>[data-safe-area-bottom]]:h-0 [&:has([data-keyboard-open]:not([data-page-leaving],[data-page-leaving]_*))>[data-safe-area-bottom]]:h-0 [&:has([data-native-tab-bar],[data-main-tab-bar])>[data-safe-area-bottom]]:h-0 [[data-keyboard-open]_&>[data-safe-area-bottom]]:h-0"
    >
      {children}
      <div
        aria-hidden="true"
        data-safe-area-bottom=""
        className="group-has-[[data-app-background-bottom=primary]:not([data-page-leaving],[data-page-leaving]_*)]/app-frame:bg-surface-primary h-(--safe-area-bottom) shrink-0 motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out motion-safe:group-has-data-sheet-arrived/app-frame:duration-0"
      />
    </div>
  );
}
