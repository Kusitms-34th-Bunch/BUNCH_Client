import type { ReactNode } from 'react';
import { MainTabBar } from '@/features/main-navigation/components';

// 하단 탭이 있는 화면(피드·사진함·번치·MY)
// 웹 탭바는 본문 위에 떠 있고(막대 64px + 아래 여백 16px + 아래 Safe Area, 본문은 화면 끝까지) 탭바가 보일 때만 아래 변수가 채워짐
// --main-tab-bar-height: 아래 여백을 포함한 막대 영역 높이, --main-tab-bar-scroll-inset: 막대 위 36px(Figma 사진함_02, 스크롤 끝 사진과 막대 사이)까지 더한 값
// iOS 시스템 탭 바(data-native-tab-bar)면 본문이 탭 바 뒤까지 이어지므로 탭 바 높이(쉘이 아래 Safe Area에 포함해 넘김)로 같은 두 변수를 채움
// 화면이 HideMainTabBar를 렌더하면(선택 모드 등) 막대를 숨기고, 본문은 화면 끝까지 둔 채 두 변수를 아래 Safe Area(홈 인디케이터)로 되돌림(MainTabBar의 group-has 참고)
// 본문 하단 여백은 PageShell이 --main-tab-bar-scroll-inset으로 처리하고, 화면은 고정 요소만 --main-tab-bar-height + --main-tab-bar-float-gap(고정 요소와 아래(막대 또는 화면 끝) 사이 간격 10px, 막대 유무와 상관없이 유지) 기준으로 올림
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="group/main flex min-h-0 flex-1 flex-col [--main-tab-bar-float-gap:0.625rem] [--main-tab-bar-height:0px] [--main-tab-bar-scroll-inset:0px] has-data-hide-main-tab-bar:[--main-tab-bar-height:var(--safe-area-bottom)]! has-data-hide-main-tab-bar:[--main-tab-bar-scroll-inset:var(--safe-area-bottom)]! has-data-main-tab-bar:[--main-tab-bar-height:calc(5rem+var(--safe-area-bottom))] has-data-main-tab-bar:[--main-tab-bar-scroll-inset:calc(7.25rem+var(--safe-area-bottom))] has-data-native-tab-bar:[--main-tab-bar-height:var(--safe-area-bottom)] has-data-native-tab-bar:[--main-tab-bar-scroll-inset:calc(var(--safe-area-bottom)+2.25rem)]">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <MainTabBar />
    </div>
  );
}
