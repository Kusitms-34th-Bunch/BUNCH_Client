import type { ReactNode } from 'react';
import { AppFrame } from '@/shared/components/layout/AppFrame';

// 일반 화면 틀(폭·Safe Area·높이) — 전체 화면 캔버스 화면은 이 group 밖에 배치
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
