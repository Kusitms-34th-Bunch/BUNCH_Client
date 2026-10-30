import type { ReactNode } from 'react';
import { MainTabBar } from '@/features/main-navigation/components';

// 하단 탭이 있는 화면(피드·사진함·번치·MY)
// 웹 탭바는 본문 위에 떠 있어 화면이 하단 여백(--main-tab-bar-height)을 스스로 확보. 탭바가 없으면(iOS 쉘) 0
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col [--main-tab-bar-height:0px] has-data-[main-tab-bar]:[--main-tab-bar-height:5rem]">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <MainTabBar />
    </div>
  );
}
