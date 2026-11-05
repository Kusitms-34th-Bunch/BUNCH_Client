import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HeaderIconButton } from './HeaderIconButton';

describe('HeaderIconButton', () => {
  it('접근성 이름을 가진 버튼이고 누르면 onClick이 호출된다', async () => {
    const onClick = vi.fn();
    render(
      <HeaderIconButton label="뒤로 가기" onClick={onClick}>
        <svg />
      </HeaderIconButton>,
    );

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('아이콘 색은 기본이 진한 색이고 subtle이면 연한 색이다', () => {
    const { rerender } = render(
      <HeaderIconButton label="닫기">
        <svg />
      </HeaderIconButton>,
    );
    const primary = screen.getByRole('button', { name: '닫기' }).className;

    rerender(
      <HeaderIconButton label="닫기" tone="subtle">
        <svg />
      </HeaderIconButton>,
    );
    const subtle = screen.getByRole('button', { name: '닫기' }).className;

    expect(primary).toContain('text-icon-primary');
    expect(primary).not.toContain('text-icon-quaternary');
    expect(subtle).toContain('text-icon-quaternary');
    expect(subtle).not.toContain('text-icon-primary');
  });
});
