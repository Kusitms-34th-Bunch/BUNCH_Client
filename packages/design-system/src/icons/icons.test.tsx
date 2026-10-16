import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button, FillCircleCheckLargeIcon, LineSearchSmallIcon } from '../index';
import * as icons from './generated';

afterEach(cleanup);

describe('Icons', () => {
  it('Line 23종과 Fill 8종 모두 세 크기로 제공한다', () => {
    expect(Object.keys(icons)).toHaveLength(93);
    for (const [variant, count] of [
      ['Line', 23],
      ['Fill', 8],
    ] as const) {
      const names = Object.keys(icons).filter(
        (name) => name.startsWith(variant) && name.endsWith('SmallIcon'),
      );
      expect(names).toHaveLength(count);
      for (const name of names) {
        for (const [size, pixels] of [
          ['Small', 16],
          ['Medium', 20],
          ['Large', 24],
        ] as const) {
          const Icon = icons[name.replace('SmallIcon', `${size}Icon`) as keyof typeof icons];
          const { container, unmount } = render(<Icon />);
          const svg = container.querySelector('svg');
          expect(svg?.getAttribute('width')).toBe(String(pixels));
          expect(svg?.getAttribute('height')).toBe(String(pixels));
          expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${pixels} ${pixels}`);
          expect(svg?.getAttribute('aria-hidden')).toBe('true');
          expect(svg?.getAttribute('focusable')).toBe('false');
          unmount();
        }
      }
    }
  });

  it('이름을 제공하면 이미지로 노출하고 ref와 className을 전달한다', () => {
    const ref = createRef<SVGSVGElement>();
    render(
      <FillCircleCheckLargeIcon aria-label="저장 완료" ref={ref} className="text-icon-brand" />,
    );
    const icon = screen.getByRole('img', { name: '저장 완료' });
    expect(icon.getAttribute('aria-hidden')).toBeNull();
    expect(icon.getAttribute('class')).toBe('text-icon-brand');
    expect(ref.current).toBe(icon);
  });

  it('외부 텍스트로 이름을 연결할 수 있다', () => {
    render(
      <>
        <span id="status">완료 상태</span>
        <FillCircleCheckLargeIcon aria-labelledby="status" />
      </>,
    );
    expect(screen.getByRole('img', { name: '완료 상태' })).toBeTruthy();
  });

  it('빈 이름은 장식으로 유지한다', () => {
    const { container } = render(<LineSearchSmallIcon aria-label=" " />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('Button 슬롯에서 버튼의 텍스트 이름을 유지한다', () => {
    render(<Button leftIcon={<LineSearchSmallIcon />}>검색</Button>);
    expect(screen.getByRole('button', { name: '검색' })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
