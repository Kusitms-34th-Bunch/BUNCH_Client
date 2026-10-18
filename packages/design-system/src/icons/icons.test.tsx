import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { IconSize } from './types';
import { Button, FillCircleCheckIcon, LineSearchIcon } from '../index';
import * as icons from './generated';

afterEach(cleanup);

const dynamicIcons = Object.fromEntries(
  Object.entries(icons).filter(
    ([name]) => !/(Small|Medium|Large)Icon$/.test(name) && !name.startsWith('Graphic'),
  ),
);
const graphicIcons = Object.fromEntries(
  Object.entries(icons).filter(([name]) => name.startsWith('Graphic')),
);
const GRAPHIC_SIZES: Record<string, number> = {
  GraphicGlobeIcon: 34,
  GraphicLockIcon: 34,
  GraphicChatIcon: 40,
  GraphicEditIcon: 40,
  GraphicPeopleIcon: 40,
};

const SIZES: [IconSize, number][] = [
  ['sm', 16],
  ['md', 20],
  ['lg', 24],
];

describe('Icons', () => {
  it('Line 23종과 Fill 8종을 아이콘 하나씩 제공한다', () => {
    expect(Object.keys(dynamicIcons)).toHaveLength(31);
    expect(Object.keys(dynamicIcons).filter((name) => name.startsWith('Line'))).toHaveLength(23);
    expect(Object.keys(dynamicIcons).filter((name) => name.startsWith('Fill'))).toHaveLength(8);
  });

  it('모든 아이콘이 세 크기의 도형과 장식 기본값을 갖는다', () => {
    for (const Icon of Object.values(dynamicIcons)) {
      for (const [size, pixels] of SIZES) {
        const { container, unmount } = render(<Icon size={size} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('width')).toBe(String(pixels));
        expect(svg?.getAttribute('height')).toBe(String(pixels));
        expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${pixels} ${pixels}`);
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.getAttribute('focusable')).toBe('false');
        unmount();
      }
    }
  });

  it('fixed exports preserve the exact geometry and accessibility of every size', () => {
    expect(Object.keys(icons)).toHaveLength(129);
    for (const [name, Icon] of Object.entries(dynamicIcons)) {
      for (const [size, label] of [
        ['sm', 'Small'],
        ['md', 'Medium'],
        ['lg', 'Large'],
      ] as const) {
        const fixedName = name.replace(/Icon$/, `${label}Icon`) as keyof typeof icons;
        const Fixed = icons[fixedName];
        const dynamic = render(<Icon size={size} aria-label="아이콘" />);
        const markup = dynamic.container.innerHTML;
        dynamic.unmount();
        const fixed = render(<Fixed aria-label="아이콘" />);
        expect(fixed.container.innerHTML).toBe(markup);
        fixed.unmount();
      }
    }
  });

  it('그래픽 아이콘 5종이 Figma 크기(34·40px)와 원본 색, 장식 기본값을 갖는다', () => {
    expect(Object.keys(graphicIcons).sort()).toEqual(Object.keys(GRAPHIC_SIZES).sort());
    for (const [name, Icon] of Object.entries(graphicIcons)) {
      const pixels = GRAPHIC_SIZES[name];
      const { container, unmount } = render(<Icon />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe(String(pixels));
      expect(svg?.getAttribute('height')).toBe(String(pixels));
      expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${pixels} ${pixels}`);
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.getAttribute('focusable')).toBe('false');
      expect(container.innerHTML).toContain('#');
      expect(container.innerHTML).not.toContain('currentColor');
      unmount();
    }
  });

  it('그래픽 아이콘에 이름을 주면 img로 노출한다', () => {
    render(<icons.GraphicLockIcon aria-label="비공개" />);
    expect(screen.getByRole('img', { name: '비공개' })).toBeTruthy();
  });

  it('size를 주지 않으면 md(20px)다', () => {
    const { container } = render(<LineSearchIcon />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('20');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 20 20');
  });

  it('크기마다 Figma가 그린 선 굵기를 유지한다(small 1.2, medium·large 1.5)', () => {
    const widthOf = (size: IconSize) => {
      const { container, unmount } = render(<LineSearchIcon size={size} />);
      const width = container.querySelector('path[stroke]')?.getAttribute('stroke-width');
      unmount();
      return width;
    };
    expect(widthOf('sm')).toBe('1.2');
    expect(widthOf('md')).toBe('1.5');
    expect(widthOf('lg')).toBe('1.5');
  });

  it('이름을 제공하면 이미지로 노출하고 ref와 className을 전달한다', () => {
    const ref = createRef<SVGSVGElement>();
    render(
      <FillCircleCheckIcon
        aria-label="저장 완료"
        ref={ref}
        size="lg"
        className="text-icon-brand"
      />,
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
        <FillCircleCheckIcon aria-labelledby="status" />
      </>,
    );
    expect(screen.getByRole('img', { name: '완료 상태' })).toBeTruthy();
  });

  it('빈 이름은 장식으로 유지한다', () => {
    const { container } = render(<LineSearchIcon aria-label=" " />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('Button 슬롯에서 버튼의 텍스트 이름을 유지한다', () => {
    render(<Button leftIcon={<LineSearchIcon size="sm" />}>검색</Button>);
    expect(screen.getByRole('button', { name: '검색' })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
  it.each(SIZES)('size=%s에서도 같은 접근성 계약을 지킨다', (size) => {
    const { container, rerender } = render(<LineSearchIcon size={size} aria-label="검색" />);
    const named = screen.getByRole('img', { name: '검색' });
    expect(named.getAttribute('aria-hidden')).toBeNull();
    expect(named.getAttribute('focusable')).toBe('false');

    rerender(<LineSearchIcon size={size} aria-label=" " />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    rerender(
      <>
        <span id="status">상태</span>
        <LineSearchIcon size={size} aria-labelledby="status" />
      </>,
    );
    expect(screen.getByRole('img', { name: '상태' })).toBeTruthy();
  });
});
