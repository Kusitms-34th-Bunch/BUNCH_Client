import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollFocusedIntoView } from './useScrollFocusedIntoView';

function Probe() {
  useScrollFocusedIntoView();
  return <input aria-label="입력" />;
}

// jsdom에는 visualViewport가 없어 크기 변화를 흉내 내는 대역을 둔다
class FakeViewport extends EventTarget {
  scale = 1;
}

describe('useScrollFocusedIntoView', () => {
  let viewport: FakeViewport;
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    viewport = new FakeViewport();
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    Element.prototype.scrollIntoView = scrollIntoView;
    scrollIntoView.mockClear();
  });
  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
  });

  it('입력창에 포커스하면 nearest로 스크롤을 요청한다', () => {
    const { getByLabelText } = render(<Probe />);

    getByLabelText('입력').focus();

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('키보드로 화면 높이가 바뀌면 포커스된 입력창을 다시 보이게 한다', () => {
    const { getByLabelText } = render(<Probe />);
    getByLabelText('입력').focus();
    scrollIntoView.mockClear();

    viewport.dispatchEvent(new Event('resize'));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('핀치 줌으로 확대한 동안에는 스크롤하지 않는다', () => {
    const { getByLabelText } = render(<Probe />);
    getByLabelText('입력').focus();
    scrollIntoView.mockClear();

    viewport.scale = 2;
    viewport.dispatchEvent(new Event('resize'));

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('입력창이 아닌 요소에 포커스가 있으면 스크롤하지 않는다', () => {
    render(<Probe />);
    viewport.dispatchEvent(new Event('resize'));

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('언마운트하면 리스너를 해제한다', () => {
    const { getByLabelText, unmount } = render(<Probe />);
    getByLabelText('입력').focus();
    unmount();
    scrollIntoView.mockClear();

    viewport.dispatchEvent(new Event('resize'));

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
