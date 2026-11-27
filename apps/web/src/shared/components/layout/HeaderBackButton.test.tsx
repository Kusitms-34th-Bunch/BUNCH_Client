import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HeaderBackButton } from './HeaderBackButton';

describe('HeaderBackButton', () => {
  it('「뒤로 가기」 이름의 버튼이고 아이콘은 읽지 않으며 누르면 onClick이 호출된다', async () => {
    const onClick = vi.fn();
    render(<HeaderBackButton onClick={onClick} />);
    const button = screen.getByRole('button', { name: '뒤로 가기' });

    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('초점 ref와 아이콘 색을 그대로 넘긴다', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<HeaderBackButton ref={ref} tone="subtle" />);

    expect(ref.current).toBe(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(ref.current).toHaveClass('text-icon-quaternary');
  });

  it('뒤로 가기는 배경 없이 아이콘이 줄며 흐려지는 눌림을 쓴다(Figma 8311:57033)', () => {
    render(<HeaderBackButton />);

    expect(screen.getByRole('button', { name: '뒤로 가기' })).toHaveClass('press-icon-fade');
    expect(screen.getByRole('button', { name: '뒤로 가기' })).not.toHaveClass('press-icon-overlay');
  });
});
