import { useSyncExternalStore } from 'react';

// 키보드 없이 화면 높이가 조금 바뀌는 경우(주소 표시줄 등)와 구분하는 최소 높이
const KEYBOARD_MIN_HEIGHT = 120;

const subscribe = (onChange: () => void) => {
  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', onChange);
  return () => viewport?.removeEventListener('resize', onChange);
};

const getSnapshot = () => {
  const viewport = window.visualViewport;
  return !!viewport && window.innerHeight - viewport.height * viewport.scale > KEYBOARD_MIN_HEIGHT;
};

/** 화면 키보드가 올라와 보이는 높이가 줄었는지(iOS WebView는 키보드가 떠도 레이아웃 높이가 그대로) */
export function useKeyboardOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
