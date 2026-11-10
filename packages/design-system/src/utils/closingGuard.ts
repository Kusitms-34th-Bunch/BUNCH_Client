import type { KeyboardEvent } from 'react';

/**
 * 닫히는 중인 팝업 안에서 Enter·Space로 버튼이 다시 눌리지 않게 막음(포인터는 CSS로 막음)
 * 초점 복원이 닫힘이 끝난 뒤라 그동안 초점이 누른 버튼에 남기 때문
 */
export const blockKeysWhileClosing = (event: KeyboardEvent<HTMLElement>) => {
  if (!event.currentTarget.hasAttribute('data-ending-style')) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  event.stopPropagation();
};
