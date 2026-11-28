import { type FocusEvent, useEffect, useState } from 'react';

// 마지막 입력 수단(입력칸은 마우스로 눌러도 :focus-visible이 켜져 직접 판단)
// null은 알 수 없음(첫 로드·창 전환 뒤 복원): 키보드 사용자가 놓치지 않게 윤곽을 켜는 쪽으로 봄
let lastInputKeyboard: boolean | null = null;
let listening = false;

const listenInputModality = () => {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      lastInputKeyboard = true;
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    () => {
      lastInputKeyboard = false;
    },
    true,
  );
  // 다른 창에서 돌아와 복원되는 포커스는 입력 수단을 알 수 없음
  window.addEventListener('blur', () => {
    lastInputKeyboard = null;
  });
};

// 첫 컴포넌트가 열리게 한 키 입력도 놓치지 않게 불러오는 시점에 등록
listenInputModality();

/**
 * 입력칸 바깥 상자의 포커스 윤곽을 키보드(Tab 등)로 들어왔을 때만 켬
 * 돌려받은 props를 바깥 상자에 펼치고 `data-focus-keyboard:` 변형으로 윤곽을 그림
 */
export const useKeyboardFocusWithin = () => {
  const [keyboardFocused, setKeyboardFocused] = useState(false);

  useEffect(() => listenInputModality(), []);

  return {
    'data-focus-keyboard': keyboardFocused || undefined,
    onFocus: () => setKeyboardFocused(lastInputKeyboard !== false),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      setKeyboardFocused(false);
    },
    // 키보드로 들어온 뒤 상자를 마우스로 누르면 윤곽을 끔
    onPointerDown: () => setKeyboardFocused(false),
  };
};
