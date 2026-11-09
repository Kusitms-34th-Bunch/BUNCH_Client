import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RippleLoading, RippleLoadingOverlay } from './RippleLoading';

describe('RippleLoading', () => {
  it('모듈 13개를 보이고 보조 기술에는 숨긴다', () => {
    const { container } = render(<RippleLoading />);
    const root = container.firstElementChild as HTMLElement;

    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.querySelectorAll('span')).toHaveLength(13);
  });

  it('모듈은 십자 모양 좌표(10px 격자)에 겹치지 않게 놓인다', () => {
    const { container } = render(<RippleLoading />);
    const positions = [...container.querySelectorAll('span')].map(
      (module) => `${module.style.left}/${module.style.top}`,
    );

    expect(positions).toContain('30px/30px');
    expect(positions).toContain('30px/0px');
    expect(positions).toContain('60px/30px');
    expect(new Set(positions).size).toBe(13);
  });

  it('오버레이는 화면 전체를 dim으로 덮고 가운데에 파동을 둔다', () => {
    const { container } = render(<RippleLoadingOverlay />);
    const overlay = container.firstElementChild as HTMLElement;

    expect(overlay.className).toContain('bg-overlay-dim-subtle');
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('inset-0');
    expect(overlay.className).toContain('items-center');
    expect(overlay.className).toContain('justify-center');
    expect(overlay.querySelectorAll('span')).toHaveLength(13);
  });
});
