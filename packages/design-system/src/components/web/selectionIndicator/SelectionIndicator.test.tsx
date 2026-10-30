import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SelectionIndicator } from './SelectionIndicator';

describe('SelectionIndicator', () => {
  it('선택 전은 반투명 흰 원이고 순서를 그리지 않는다', () => {
    const { container } = render(<SelectionIndicator order={1} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('bg-white/60');
    expect(el.className).toContain('border-white');
    expect(el.textContent).toBe('');
  });

  it('선택 후는 흰 원 안에 순서를 그린다', () => {
    const { container } = render(<SelectionIndicator selected order={3} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).not.toContain('bg-white/60');
    expect(el.className.split(' ')).toContain('bg-white');
    expect(el.textContent).toBe('3');
  });

  it('20px 원이고 기본은 장식(aria-hidden)이다', () => {
    const { container } = render(<SelectionIndicator />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('size-5');
    expect(el.className).toContain('rounded-full');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('단독 사용 시 aria 속성을 덮어쓸 수 있다', () => {
    const { container } = render(
      <SelectionIndicator
        selected
        order={1}
        aria-hidden={false}
        role="img"
        aria-label="1번째 선택"
      />,
    );
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('false');
    expect(container.firstElementChild?.getAttribute('aria-label')).toBe('1번째 선택');
  });
});
