import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePhotoPinchZoom } from './usePhotoPinchZoom';

function Photos({ loading = false }: { loading?: boolean }) {
  const ref = usePhotoPinchZoom();
  // 상세를 받는 동안에는 사진 틀이 없다가 받은 뒤 생김
  if (loading) return <p>받는 중</p>;
  return (
    <div ref={ref}>
      <div data-testid="slide">
        {/* eslint-disable-next-line @next/next/no-img-element -- 상세 사진(BundlePhoto)과 같은 img 구조 */}
        <img src="/a.jpg" alt="첫 사진" />
        <button type="button">사진 위 버튼</button>
      </div>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- 상세 사진(BundlePhoto)과 같은 img 구조 */}
        <img src="/b.jpg" alt="둘째 사진" />
      </div>
    </div>
  );
}

// 테스트 DOM에 Touch 생성자가 없어 터치 목록만 흉내
const touchEvent = (type: string, points: { target: Element; x: number; y: number }[]) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touches = points.map(({ target, x, y }) => ({ target, clientX: x, clientY: y }));
  Object.defineProperty(event, 'touches', { value: touches });
  return event;
};

const zoomClone = () => document.body.querySelector('body > img[aria-hidden="true"]');

afterEach(() => {
  document.body.innerHTML = '';
});

describe('usePhotoPinchZoom', () => {
  it('복제본 디코딩이 끝나기 전에는 원본을 그대로 보이고 복제본은 투명하다', async () => {
    let decoded = () => {};
    const decode = vi.spyOn(HTMLImageElement.prototype, 'decode').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          decoded = resolve;
        }),
    );
    try {
      const { getByAltText } = render(<Photos />);
      const photo = getByAltText('둘째 사진');
      photo.dispatchEvent(
        touchEvent('touchstart', [
          { target: photo, x: 100, y: 100 },
          { target: photo, x: 140, y: 100 },
        ]),
      );
      expect((zoomClone() as HTMLElement).style.opacity).toBe('0');
      expect(photo.style.visibility).toBe('');

      // 디코딩 전에 손을 떼면 복제본을 치우고, 뒤늦게 끝나도 원본을 숨기지 않음
      photo.dispatchEvent(touchEvent('touchend', [{ target: photo, x: 100, y: 100 }]));
      expect(zoomClone()).toBeNull();
      await act(async () => {
        decoded();
        await Promise.resolve();
      });
      expect(zoomClone()).toBeNull();
      expect(photo.style.visibility).toBe('');
    } finally {
      decode.mockRestore();
    }
  });

  it('같은 사진에 두 손가락을 대고 벌리면 화면 위 복제본이 커지고, 손을 떼면 치우고 원래 사진을 다시 보인다', async () => {
    const { getByAltText, getByRole } = render(<Photos />);
    const photo = getByAltText('첫 사진');
    const button = getByRole('button');

    const start = touchEvent('touchstart', [
      { target: photo, x: 100, y: 100 },
      { target: button, x: 140, y: 100 },
    ]);
    button.dispatchEvent(start);
    expect(start.defaultPrevented).toBe(true);
    expect(zoomClone()).not.toBeNull();
    // 복제본을 다 그린 뒤에 원본과 바꿈
    await act(() => Promise.resolve());
    expect(photo.style.visibility).toBe('hidden');
    expect((zoomClone() as HTMLElement).style.opacity).toBe('');

    const move = touchEvent('touchmove', [
      { target: photo, x: 80, y: 100 },
      { target: button, x: 160, y: 100 },
    ]);
    button.dispatchEvent(move);
    expect(move.defaultPrevented).toBe(true);
    expect((zoomClone() as HTMLElement).style.transform).toContain('scale(2)');

    button.dispatchEvent(touchEvent('touchend', [{ target: photo, x: 80, y: 100 }]));
    // 테스트 DOM은 Web Animations가 없어 바로 치움
    expect(zoomClone()).toBeNull();
    expect(photo.style.visibility).toBe('');
  });

  it('받는 중 화면 뒤에 사진 틀이 생겨도 확대가 연결되고, 확대 중 사진이 빠져도 손을 떼면 정리된다', () => {
    const { rerender, getByAltText } = render(<Photos loading />);
    rerender(<Photos />);
    const photo = getByAltText('첫 사진');

    photo.dispatchEvent(
      touchEvent('touchstart', [
        { target: photo, x: 100, y: 100 },
        { target: photo, x: 140, y: 100 },
      ]),
    );
    expect(zoomClone()).not.toBeNull();

    rerender(<Photos loading />);
    document.dispatchEvent(touchEvent('touchend', []));
    expect(zoomClone()).toBeNull();
  });

  it('한 손가락이거나 두 손가락이 서로 다른 사진이면 확대하지 않고 스크롤·넘김을 막지 않는다', () => {
    const { getByAltText } = render(<Photos />);
    const first = getByAltText('첫 사진');
    const second = getByAltText('둘째 사진');

    const one = touchEvent('touchstart', [{ target: first, x: 0, y: 0 }]);
    first.dispatchEvent(one);
    const split = touchEvent('touchstart', [
      { target: first, x: 0, y: 0 },
      { target: second, x: 40, y: 0 },
    ]);
    first.dispatchEvent(split);

    expect(one.defaultPrevented).toBe(false);
    expect(split.defaultPrevented).toBe(false);
    expect(zoomClone()).toBeNull();
  });
});
