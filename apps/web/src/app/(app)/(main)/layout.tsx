import type { ReactNode } from 'react';
import { MainTabBar } from '@/features/main-navigation/components';

// 하단 탭이 있는 화면(피드·사진함·번치·MY)
// 웹 탭바는 본문 위에 떠 있고(막대 높이 4rem, 아래는 Safe Area) 탭바가 보일 때만 아래 변수가 채워짐, 없으면(iOS 쉘) 0
// --main-tab-bar-height: 막대 높이, --main-tab-bar-scroll-inset: 스크롤 끝 사진과 막대 사이 36px(Figma 사진함_02)까지 더한 값
// 본문 하단 여백은 PageShell이 --main-tab-bar-scroll-inset으로 처리하고, 화면은 고정 요소만 --main-tab-bar-height 기준으로 올림
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col [--main-tab-bar-height:0px] [--main-tab-bar-scroll-inset:0px] has-data-[main-tab-bar]:[--main-tab-bar-height:4rem] has-data-[main-tab-bar]:[--main-tab-bar-scroll-inset:6.25rem]">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <MainTabBar />
    </div>
  );
}
