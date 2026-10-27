import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddMemberCard } from './AddMemberCard';

describe('AddMemberCard', () => {
  it('"추가" 글자가 이름인 버튼이고 기본 type은 button이다', () => {
    render(<AddMemberCard />);
    const button = screen.getByRole('button', { name: '추가' });

    expect(button.getAttribute('type')).toBe('button');
  });

  it('label로 글자와 접근성 이름을 바꾼다', () => {
    render(<AddMemberCard label="멤버 추가" />);

    expect(screen.getByRole('button', { name: '멤버 추가' })).toBeTruthy();
  });

  it('누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<AddMemberCard onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('흰 배경에 border-secondary 테두리, 반경 r4이고 더하기 원은 숨겨진다', () => {
    const { container } = render(<AddMemberCard />);
    const { classList } = screen.getByRole('button');

    expect(classList.contains('bg-surface-primary')).toBe(true);
    expect(classList.contains('border')).toBe(true);
    expect(classList.contains('border-border-secondary')).toBe(true);
    expect(classList.contains('rounded-r4')).toBe(true);
    expect(container.querySelector('button > span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('더하기 원은 40px에 secondary 배경이고 글자와 함께 quaternary 색이다', () => {
    const { container } = render(<AddMemberCard />);
    const circle = container.querySelector('button > span') as HTMLElement;

    expect(circle.classList.contains('size-10')).toBe(true);
    expect(circle.classList.contains('bg-surface-secondary')).toBe(true);
    expect(circle.classList.contains('text-text-quaternary')).toBe(true);
    expect(screen.getByText('추가').classList.contains('text-text-quaternary')).toBe(true);
  });

  it('aria-label을 주면 보이는 글자는 그대로 두고 접근성 이름만 구체화한다', () => {
    render(<AddMemberCard aria-label="멤버 추가" />);

    expect(screen.getByRole('button', { name: '멤버 추가' }).textContent).toBe('추가');
  });

  it('포커스 윤곽선 클래스가 있다', () => {
    render(<AddMemberCard />);
    const { classList } = screen.getByRole('button');

    expect(classList.contains('focus-visible:outline-2')).toBe(true);
    expect(classList.contains('focus-visible:outline-border-brand')).toBe(true);
  });

  it('type을 다시 정할 수 있고 className이 합쳐진다', () => {
    render(<AddMemberCard type="submit" className="mt-2" />);
    const button = screen.getByRole('button');

    expect(button.getAttribute('type')).toBe('submit');
    expect(button.className).toContain('mt-2');
  });
});
