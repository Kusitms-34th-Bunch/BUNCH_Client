type Listener = () => void;

let visible = false;
const listeners = new Set<Listener>();

/** 첫 화면 WebView 뒤의 로그인 배경 영상 표시 여부(웹의 setNativeLoginBackground 요청) */
export const loginBackgroundStore = {
  get: () => visible,
  set: (next: boolean) => {
    if (visible === next) return;
    visible = next;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
