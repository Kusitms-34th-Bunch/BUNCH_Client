import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CloseButton } from './CloseButton';

afterEach(cleanup);

describe('CloseButton', () => {
  it('aria-label이 버튼의 접근성 이름이고 아이콘은 읽지 않는다', () => {
    render(<CloseButton aria-label="닫기" />);

    const button = screen.getByRole('button', { name: '닫기' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<CloseButton aria-label="닫기" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
