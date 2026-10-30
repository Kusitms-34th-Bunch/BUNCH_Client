import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuLabel } from './MenuLabel';

afterEach(cleanup);

describe('MenuLabel', () => {
  it('글자가 버튼 이름이고 화살표는 이름에 섞이지 않는다', () => {
    render(<MenuLabel>신고하기</MenuLabel>);

    const button = screen.getByRole('button', { name: '신고하기' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<MenuLabel onClick={onClick}>차단하기</MenuLabel>);

    fireEvent.click(screen.getByRole('button', { name: '차단하기' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
