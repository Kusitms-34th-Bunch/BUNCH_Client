import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageNumber } from './PageNumber';

afterEach(cleanup);

describe('PageNumber', () => {
  it('번호가 버튼의 접근성 이름이다', () => {
    render(<PageNumber page={2} />);

    expect(screen.getByRole('button', { name: '2' }).getAttribute('type')).toBe('button');
  });

  it('현재 페이지면 aria-current="page"로 알린다', () => {
    render(
      <>
        <PageNumber page={1} selected />
        <PageNumber page={2} />
      </>,
    );

    expect(screen.getByRole('button', { name: '1' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: '2' }).hasAttribute('aria-current')).toBe(false);
  });

  it('누르면 onClick을 부르고 비활성이면 부르지 않는다', () => {
    const onClick = vi.fn();
    render(
      <>
        <PageNumber page={3} onClick={onClick} />
        <PageNumber page={4} onClick={onClick} disabled />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('호출자가 접근성 이름을 바꿀 수 있다', () => {
    render(<PageNumber page={5} aria-label="5페이지" />);

    expect(screen.getByRole('button', { name: '5페이지' })).toBeTruthy();
  });
});
