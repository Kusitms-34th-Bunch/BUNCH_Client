import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FloatingButton } from './FloatingButton';

describe('FloatingButton', () => {
  it('aria-label이 버튼의 이름이다', () => {
    render(<FloatingButton aria-label="더보기" />);

    expect(screen.getByRole('button', { name: '더보기' })).toBeTruthy();
  });

  it('눌러서 onClick을 부른다', async () => {
    const onClick = vi.fn();
    render(<FloatingButton aria-label="더보기" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: '더보기' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('키보드 Enter·Space로도 누른다', async () => {
    const onClick = vi.fn();
    render(<FloatingButton aria-label="더보기" onClick={onClick} />);

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button'));
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('disabled이면 눌러도 동작하지 않고 포커스도 받지 않는다', async () => {
    const onClick = vi.fn();
    render(<FloatingButton aria-label="더보기" disabled onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));
    await userEvent.tab();

    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(screen.getByRole('button'));
  });

  it('기본 type은 button이라 form 안에서 제출하지 않는다', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <FloatingButton aria-label="더보기" />
      </form>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('아이콘은 보조기기에서 숨긴다', () => {
    const { container } = render(<FloatingButton aria-label="더보기" />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('icon을 주지 않으면 점 세 개, add를 주면 더하기 아이콘을 그린다', () => {
    const more = render(<FloatingButton aria-label="더보기" />).container.innerHTML;
    const add = render(<FloatingButton aria-label="사진 추가" icon="add" />).container.innerHTML;

    expect(more).not.toBe(add.replace('사진 추가', '더보기'));
  });

  it('icon이 바뀌어도 이름은 aria-label이고 아이콘은 숨긴다', () => {
    const { container } = render(<FloatingButton aria-label="사진 추가" icon="add" />);

    expect(screen.getByRole('button', { name: '사진 추가' })).toBeTruthy();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('type을 다시 정할 수 있다', () => {
    render(<FloatingButton aria-label="더보기" type="submit" />);

    expect(screen.getByRole('button').getAttribute('type')).toBe('submit');
  });

  it('className을 병합하고 나머지 button 속성을 전달한다', () => {
    render(<FloatingButton aria-label="더보기" className="fixed right-4" data-testid="fab" />);

    const button = screen.getByTestId('fab');
    expect(button.classList.contains('fixed')).toBe(true);
    expect(button.classList.contains('right-4')).toBe(true);
    expect(button.classList.contains('relative')).toBe(false);
  });
});
