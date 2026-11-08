import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlacePickButton } from './PlacePickButton';

describe('PlacePickButton', () => {
  it('담기 전에는 「콕하기」, 담긴 뒤에는 「콕 했어요」이고 눌림 상태 속성은 없다', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<PlacePickButton picked={false} onClick={onClick} />);
    const button = screen.getByRole('button', { name: '콕하기' });

    expect(button.getAttribute('aria-pressed')).toBeNull();
    expect(button.className).toContain('text-text-secondary');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<PlacePickButton picked onClick={onClick} />);
    const picked = screen.getByRole('button', { name: '콕 했어요' });
    expect(picked.getAttribute('aria-pressed')).toBeNull();
    expect(picked.className).toContain('bg-surface-inversed');
    expect(picked.className).not.toContain('text-text-secondary');
  });

  it('label·pickedLabel을 주면 그 글자가 이름이 된다', () => {
    const { rerender } = render(
      <PlacePickButton picked={false} label="담기" pickedLabel="담았어요" />,
    );
    expect(screen.getByRole('button', { name: '담기' })).toBeTruthy();

    rerender(<PlacePickButton picked label="담기" pickedLabel="담았어요" />);
    expect(screen.getByRole('button', { name: '담았어요' })).toBeTruthy();
  });
});
