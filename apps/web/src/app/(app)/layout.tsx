import type { ReactNode } from 'react';
import { AppFrame } from '@/shared/components/layout/AppFrame';

// 일반 화면의 틀(폭·Safe Area·화면 높이). 번들 룸처럼 전체 화면 캔버스가 필요한 화면은 이 group 밖에 둔다.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
