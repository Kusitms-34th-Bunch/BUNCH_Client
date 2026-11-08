import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LikeButton } from './LikeButton';

describe('LikeButton', () => {
  it('「좋아요」와 수가 이름이고 눌림 상태를 알린다', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<LikeButton liked={false} count={4} onClick={onClick} />);
    const button = screen.getByRole('button', { name: '좋아요 4' });

    expect(button.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<LikeButton liked count={5} onClick={onClick} />);
    expect(screen.getByRole('button', { name: '좋아요 5' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('처음에는 모션이 없고 누를 때마다 하트를 새로 그려 다시 재생한다', async () => {
    render(<LikeButton liked={false} count={0} />);
    const button = screen.getByRole('button', { name: '좋아요 0' });
    const firstHeart = button.querySelector('svg');

    expect(firstHeart?.getAttribute('class')).not.toContain('bounce');
    await userEvent.click(button);
    const secondHeart = button.querySelector('svg');
    expect(secondHeart).not.toBe(firstHeart);
    expect(secondHeart?.getAttribute('class')).toContain('bounce');
    await userEvent.click(button);
    expect(button.querySelector('svg')).not.toBe(secondHeart);
  });
});
