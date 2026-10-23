import type { ReactNode } from 'react';
import { MainTabBar } from '@/features/main-navigation/components';

// 하단 탭이 있는 화면(피드·사진함·번치·MY)
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <MainTabBar />
    </div>
  );
}
