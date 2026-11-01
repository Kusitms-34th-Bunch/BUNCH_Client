import type { PointerEvent } from 'react';

/** 입력 중이면 포커스를 풀어 모바일 키보드 닫기 */
export const closeKeyboard = () => {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) active.blur();
};

/**
 * 입력창·라벨·버튼이 아닌 빈 영역을 누르면 키보드 닫기(화면 감싸는 요소의 onPointerDown에 연결)
 * 다른 입력을 누르면 키보드를 유지한 채 포커스만 이동. 버튼은 누르는 중에 닫으면 화면이 밀려 탭이 사라지므로 클릭 뒤에 닫기
 */
export const dismissKeyboard = (event: PointerEvent<HTMLElement>) => {
  if (event.target instanceof Element && event.target.closest('input, textarea, label, button'))
    return;
  closeKeyboard();
};
