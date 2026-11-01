import type { ReactNode } from 'react';
import { MAIN_TAB_PATHS, type MainTabId } from '../constants/tabs';

/**
 * 하단 탭 화면의 페이지 전환 대상(결정 기록 017의 탭 크로스페이드). 탭 page가 내용을 이 틀로 감쌈
 * 아래 깔리는 들어오는 탭이 비치지 않도록 불투명 배경
 */
export function MainTabPage({ tab, children }: { tab: MainTabId; children: ReactNode }) {
  return (
    <div
      data-ssgoi-transition={MAIN_TAB_PATHS[tab]}
      className="bg-surface-primary flex h-full min-h-0 flex-1 flex-col"
    >
      {children}
    </div>
  );
}
