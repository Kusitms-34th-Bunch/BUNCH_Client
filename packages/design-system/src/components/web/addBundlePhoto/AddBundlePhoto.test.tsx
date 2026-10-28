import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddBundlePhoto } from './AddBundlePhoto';

describe('AddBundlePhoto', () => {
  it('"사진 추가" 글자가 이름인 버튼이고 기본 type은 button이다', () => {
    render(<AddBundlePhoto />);

    expect(screen.getByRole('button', { name: '사진 추가' }).getAttribute('type')).toBe('button');
  });

  it('label로 글자와 접근성 이름을 바꾼다', () => {
    render(<AddBundlePhoto label="번들에 사진 넣기" />);

    expect(screen.getByRole('button', { name: '번들에 사진 넣기' })).toBeTruthy();
  });

  it('누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<AddBundlePhoto onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('기본은 330px(m) 정사각, s는 300px이다', () => {
    const { rerender } = render(<AddBundlePhoto />);

    expect(screen.getByRole('button').classList.contains('w-82.5')).toBe(true);
    expect(screen.getByRole('button').classList.contains('aspect-square')).toBe(true);

    rerender(<AddBundlePhoto size="s" />);

    expect(screen.getByRole('button').classList.contains('w-75')).toBe(true);
    expect(screen.getByRole('button').classList.contains('w-82.5')).toBe(false);
  });

  it('secondary 배경에 반경 r4이고 포커스 윤곽선이 있다', () => {
    render(<AddBundlePhoto />);
    const { classList } = screen.getByRole('button');

    expect(classList.contains('bg-surface-secondary')).toBe(true);
    expect(classList.contains('rounded-r4')).toBe(true);
    expect(classList.contains('focus-visible:outline-2')).toBe(true);
    expect(classList.contains('focus-visible:outline-border-brand')).toBe(true);
  });

  it('더하기 원은 36px 흰 원이고 숨겨지며 글자는 14/21 기본색이다', () => {
    const { container } = render(<AddBundlePhoto />);
    const circle = container.querySelector('button > span') as HTMLElement;

    expect(circle.getAttribute('aria-hidden')).toBe('true');
    expect(circle.classList.contains('size-9')).toBe(true);
    expect(circle.classList.contains('bg-surface-primary')).toBe(true);
    expect(circle.classList.contains('rounded-full')).toBe(true);
    expect(screen.getByText('사진 추가').classList.contains('typography-body-2-regular')).toBe(
      true,
    );
    expect(screen.getByText('사진 추가').classList.contains('text-text-primary')).toBe(true);
  });

  it('type을 다시 정할 수 있고 className이 합쳐진다', () => {
    render(<AddBundlePhoto type="submit" className="w-full" />);
    const button = screen.getByRole('button');

    expect(button.getAttribute('type')).toBe('submit');
    expect(button.classList.contains('w-full')).toBe(true);
    expect(button.classList.contains('w-82.5')).toBe(false);
  });
});
