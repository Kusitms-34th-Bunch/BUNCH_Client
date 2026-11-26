import { fireEvent, render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { pressScaleFor } from '@/shared/lib/pressScale';
import { PressScrollGuard } from './PressScrollGuard';

const marked = () => document.documentElement.hasAttribute('data-touch-scrolling');
const at = (x: number, y: number) => ({ touches: [{ clientX: x, clientY: y }] });

it('누른 채 손가락이 8px 넘게 움직이면 표시하고, 떼면 지운다', () => {
  render(<PressScrollGuard />);
  fireEvent.touchStart(document, at(100, 100));
  fireEvent.touchMove(document, at(100, 105));
  expect(marked()).toBe(false);

  fireEvent.touchMove(document, at(100, 120));
  expect(marked()).toBe(true);

  fireEvent.touchEnd(document, { touches: [] });
  expect(marked()).toBe(false);
});

it('누른 채 스크롤이 일어나면 표시하고, 손가락이 닿지 않은 스크롤은 무시한다', () => {
  render(<PressScrollGuard />);
  fireEvent.scroll(document);
  expect(marked()).toBe(false);

  fireEvent.touchStart(document, at(10, 10));
  fireEvent.scroll(document);
  expect(marked()).toBe(true);

  fireEvent.touchCancel(document, { touches: [] });
  expect(marked()).toBe(false);
});

it('스크롤 중에 둘째 손가락이 닿아도 표시를 유지하고, 모두 떼야 지운다', () => {
  render(<PressScrollGuard />);
  fireEvent.touchStart(document, at(100, 100));
  fireEvent.touchMove(document, at(100, 130));
  const twoFingers = {
    touches: [
      { clientX: 100, clientY: 130 },
      { clientX: 200, clientY: 200 },
    ],
  };
  fireEvent.touchStart(document, twoFingers);
  expect(marked()).toBe(true);

  fireEvent.touchEnd(document, at(100, 130));
  expect(marked()).toBe(true);
  fireEvent.touchEnd(document, { touches: [] });
  expect(marked()).toBe(false);
});

it('사라지면 표시를 지운다', () => {
  const { unmount } = render(<PressScrollGuard />);
  fireEvent.touchStart(document, at(0, 0));
  fireEvent.touchMove(document, at(0, 50));
  unmount();
  expect(marked()).toBe(false);
});

it('줄어드는 비율은 어떤 크기든 약 2px만 줄도록 크기로 계산한다(Figma 7982:51780)', () => {
  // 아이콘 24px, 아이콘 버튼 40px, 꽉 찬 CTA 342×48, 목록 줄 375×42, 큰 카드 348×308
  expect(pressScaleFor(24, 24).toFixed(3)).toBe('0.917');
  expect(pressScaleFor(40, 40).toFixed(3)).toBe('0.950');
  expect(pressScaleFor(342, 48).toFixed(3)).toBe('0.977');
  expect(pressScaleFor(375, 42).toFixed(3)).toBe('0.979');
  expect(pressScaleFor(348, 308).toFixed(3)).toBe('0.994');
});

it('누르는 순간 줄어드는 요소에 크기로 계산한 --press-scale을 넣는다', () => {
  render(<PressScrollGuard />);
  const button = document.body.appendChild(document.createElement('button'));
  button.className = 'press-scale-medium';
  const label = button.appendChild(document.createElement('span'));
  Object.defineProperty(button, 'offsetWidth', { value: 342 });
  Object.defineProperty(button, 'offsetHeight', { value: 48 });

  fireEvent.pointerDown(label);

  expect(button.style.getPropertyValue('--press-scale')).toBe('0.977');
  button.remove();
});
