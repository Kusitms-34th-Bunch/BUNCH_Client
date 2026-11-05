import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  PaginationIndicatorItem,
  type PaginationIndicatorItemProps,
} from './PaginationIndicatorItem';

const renderItem = (props?: PaginationIndicatorItemProps) => {
  const { container } = render(<PaginationIndicatorItem {...props} />);
  return container.firstElementChild as HTMLElement;
};

describe('PaginationIndicatorItem', () => {
  it('기본은 active이고 6px 진한 원이다', () => {
    const item = renderItem();

    expect(item.classList.contains('size-1.5')).toBe(true);
    expect(item.classList.contains('bg-icon-tertiary')).toBe(true);
    expect(item.classList.contains('rounded-full')).toBe(true);
  });

  it('middle은 6px 연한 원이다', () => {
    const item = renderItem({ state: 'middle' });

    expect(item.classList.contains('size-1.5')).toBe(true);
    expect(item.classList.contains('bg-surface-tertiary')).toBe(true);
    expect(item.classList.contains('bg-icon-tertiary')).toBe(false);
  });

  it('far는 4px 가장 연한 원이다', () => {
    const item = renderItem({ state: 'far' });

    expect(item.classList.contains('size-1')).toBe(true);
    expect(item.classList.contains('size-1.5')).toBe(false);
    expect(item.classList.contains('bg-surface-secondary')).toBe(true);
  });

  it('보조 기술에서는 숨겨지고 줄어들지 않는다', () => {
    const item = renderItem();

    expect(item.getAttribute('aria-hidden')).toBe('true');
    expect(item.classList.contains('shrink-0')).toBe(true);
  });

  it('className과 span 속성이 합쳐진다', () => {
    const item = renderItem({ className: 'mt-1', 'data-testid': 'dot' } as never);

    expect(item.className).toContain('mt-1');
    expect(item.getAttribute('data-testid')).toBe('dot');
  });
});
