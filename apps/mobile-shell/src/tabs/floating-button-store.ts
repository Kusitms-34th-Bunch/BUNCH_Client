import type { SetNativeFloatingButtonParams } from '@app/bridge';
import type { TabId } from './tabs';

type Button = NonNullable<SetNativeFloatingButtonParams['button']>;
type Listener = () => void;

let state: Partial<Record<TabId, Button>> = {};
const listeners = new Set<Listener>();

/** 탭별 네이티브 플로팅 버튼(웹의 setNativeFloatingButton 요청). 탭 화면이 자기 탭 값만 구독 */
export const floatingButtonStore = {
  get: () => state,
  set: (tab: TabId, button: Button | null) => {
    // 같은 내용이면 다시 그리지 않음(웹이 경로·모달 변화마다 다시 보냄)
    if (JSON.stringify(state[tab] ?? null) === JSON.stringify(button)) return;
    const next = { ...state };
    if (button) next[tab] = button;
    else delete next[tab];
    state = next;
    listeners.forEach((listener) => listener());
  },
  /** 탭 화면을 닫을 때(로그아웃) 모두 지움. 탭 WebView는 웹 정리 없이 사라짐 */
  clear: () => {
    state = {};
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
