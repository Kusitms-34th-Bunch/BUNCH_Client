import { useLayoutEffect, type RefObject } from 'react';

/**
 * 값이 바뀔 때와 폭이 바뀔 때(회전·글자 크기 변경) textarea 높이를 내용에 맞춤(auto로 줄였다가 scrollHeight로 늘림)
 * 그리기 전에 높이를 맞춰 줄바꿈 프레임에 잘려 보이지 않게 하고, 높이는 부모의 `--textarea-height`에도 전달(iOS 확대 방지 축소 보정용)
 */
export function useTextareaAutoHeight(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: unknown,
  /** textarea가 다시 만들어질 때(조건부 렌더링)처럼 값 외에 높이를 다시 맞춰야 하는 신호 */
  refitKey?: unknown,
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      element.style.height = 'auto';
      const height = element.scrollHeight;
      element.style.height = `${height}px`;
      element.parentElement?.style.setProperty('--textarea-height', `${height}px`);
    };
    fit();
    // value 없이 쓰는 입력(defaultValue)은 값이 바뀌어도 effect가 다시 돌지 않으므로 입력할 때마다 높이를 맞춤
    if (value === undefined) element.addEventListener('input', fit);
    if (typeof ResizeObserver === 'undefined' || !element.parentElement) {
      return () => element.removeEventListener('input', fit);
    }
    let lastWidth = element.parentElement.clientWidth;
    const observer = new ResizeObserver(() => {
      const width = element.parentElement?.clientWidth ?? lastWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      fit();
    });
    observer.observe(element.parentElement);
    return () => {
      element.removeEventListener('input', fit);
      observer.disconnect();
    };
  }, [ref, value, refitKey]);
}
