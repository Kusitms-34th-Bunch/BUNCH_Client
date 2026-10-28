import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

const renderButton = (props?: Partial<React.ComponentProps<typeof IconButton>>) =>
  render(
    <IconButton aria-label="다음" {...props}>
      <svg data-testid="icon" />
    </IconButton>,
  );

describe('IconButton', () => {
  it('aria-label을 이름으로 갖는 버튼이고 기본 type은 button이다', () => {
    renderButton();
    const button = screen.getByRole('button', { name: '다음' });

    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toContain('size-10');
    expect(button.className).toContain('rounded-full');
  });

  it('누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    renderButton({ onClick });

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('아이콘은 스크린 리더에서 숨겨진 래퍼 안에 그려진다', () => {
    renderButton();

    expect(screen.getByTestId('icon').parentElement?.getAttribute('aria-hidden')).toBe('true');
  });

  it('기본 변형은 subtle이다(흰 바탕, 테두리 없음)', () => {
    renderButton();
    const button = screen.getByRole('button');

    expect(button.className).toContain('bg-surface-primary');
    expect(button.className).toContain('text-icon-primary');
    expect(button.className).not.toContain('border-border-tertiary');
  });

  it('outline은 흰 바탕에 border-tertiary 테두리가 있다', () => {
    renderButton({ variant: 'outline' });
    const button = screen.getByRole('button');

    expect(button.className).toContain('bg-surface-primary');
    expect(button.classList.contains('border-border-tertiary')).toBe(true);
    expect(button.classList.contains('border')).toBe(true);
  });

  it('subtle과 primary에는 테두리 클래스가 없다', () => {
    const { rerender } = renderButton();

    expect(screen.getByRole('button').classList.contains('border')).toBe(false);

    rerender(
      <IconButton aria-label="다음" variant="primary">
        <svg />
      </IconButton>,
    );

    expect(screen.getByRole('button').classList.contains('border')).toBe(false);
  });

  it('primary는 어두운 바탕에 흰 아이콘이다', () => {
    renderButton({ variant: 'primary' });
    const button = screen.getByRole('button');

    expect(button.className).toContain('bg-surface-inversed');
    expect(button.className).toContain('text-icon-inversed');
  });

  it('눌림은 overlay-hover를 버튼 위에 얹고 동작 줄이기에서는 전환을 끈다', () => {
    renderButton();
    const { classList } = screen.getByRole('button');

    expect(classList.contains('before:bg-overlay-hover')).toBe(true);
    expect(classList.contains('active:before:opacity-100')).toBe(true);
    expect(classList.contains('motion-reduce:before:transition-none')).toBe(true);
    // 오버레이가 클릭·포커스를 가로채지 않고 아이콘 위까지 덮음
    expect(classList.contains('before:pointer-events-none')).toBe(true);
    expect(classList.contains('before:z-10')).toBe(true);
    expect(classList.contains('before:inset-0')).toBe(true);
  });

  it('type을 다시 정할 수 있고 className·button 속성이 합쳐진다', () => {
    renderButton({ type: 'submit', className: 'mt-2', 'data-testid': 'btn' } as never);
    const button = screen.getByTestId('btn');

    expect(button.getAttribute('type')).toBe('submit');
    expect(button.className).toContain('mt-2');
  });
});
