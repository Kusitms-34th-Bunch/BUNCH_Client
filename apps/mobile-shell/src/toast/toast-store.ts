import type { ShowNativeToastParams } from '@app/bridge';
import type { TabId } from '../tabs/tabs';

export type NativeToast = Omit<ShowNativeToastParams, 'tab'>;
type Listener = () => void;

let state: Partial<Record<TabId, NativeToast>> = {};
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener());

/**
 * 탭별 네이티브 토스트(웹의 showNativeToast 요청). 탭마다 하나만 두고 새 토스트가 이전 것을 대체(디자인 시스템 Toast와 같음)
 * 탭 화면이 자기 탭 값만 구독
 */
export const toastStore = {
  get: () => state,
  show: (tab: TabId, toast: NativeToast) => {
    state = { ...state, [tab]: toast };
    emit();
  },
  /** `id`를 주면 그 토스트일 때만 지움(자동 닫힘이 그 사이 들어온 새 토스트를 지우지 않게) */
  hide: (tab: TabId, id?: string) => {
    const current = state[tab];
    if (!current || (id !== undefined && current.id !== id)) return;
    const next = { ...state };
    delete next[tab];
    state = next;
    emit();
  },
  /** 탭 화면을 닫을 때(로그아웃) 모두 지움 */
  clear: () => {
    state = {};
    emit();
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
