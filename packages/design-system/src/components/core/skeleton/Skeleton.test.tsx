import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('화면 읽기 프로그램에는 보이지 않는다', () => {
    const { container } = render(<Skeleton className="h-5 w-24" />);

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('호출자가 aria-hidden을 넘겨도 숨김을 유지한다', () => {
    const { container } = render(<Skeleton aria-hidden={false} />);

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('기본은 둥근 모서리의 옅은 회색이다', () => {
    const { container } = render(<Skeleton />);
    const box = container.firstElementChild;

    expect(box?.className).toContain('rounded-r2');
    expect(box?.className).toContain('bg-surface-secondary');
  });

  it('모양과 색을 바꿀 수 있다', () => {
    const { container } = render(<Skeleton shape="round" tone="strong" />);
    const box = container.firstElementChild;

    expect(box?.className).toContain('rounded-full');
    expect(box?.className).toContain('bg-surface-tertiary');
  });

  it('동작 줄이기 설정에서는 깜빡이지 않는다', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstElementChild?.className).toContain('motion-safe:animate-pulse');
    expect(container.firstElementChild?.className).not.toMatch(/(^|\s)animate-pulse/);
  });

  it('호출자가 준 크기를 함께 쓴다', () => {
    const { container } = render(<Skeleton className="size-10" />);

    expect(container.firstElementChild?.className).toContain('size-10');
  });
});
