import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginButton } from './LoginButton';

describe('LoginButton', () => {
  it.each([
    ['apple', 'Apple로 계속하기'],
    ['google', 'Google로 계속하기'],
    ['kakao', '카카오 로그인'],
  ] as const)('%s 버튼은 넘긴 글자를 접근성 이름으로 가진다', (brand, label) => {
    render(<LoginButton brand={brand}>{label}</LoginButton>);

    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  });

  it.each([
    ['apple', 'Apple로 계속하기'],
    ['google', 'Google로 계속하기'],
    ['kakao', '카카오 로그인'],
  ] as const)('%s 로고는 접근성 이름에 섞이지 않고 화면 읽기에서 숨겨진다', (brand, label) => {
    const { container } = render(<LoginButton brand={brand}>{label}</LoginButton>);

    expect(screen.getByRole('button').textContent).toBe(label);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(container.querySelector('img[alt=""], svg[aria-hidden="true"]')).toBeTruthy();
  });

  it('type을 지정하지 않으면 form 안에서도 제출하지 않는 button이다', () => {
    render(<LoginButton brand="kakao">카카오 로그인</LoginButton>);

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('누르면 onClick을 호출하고 disabled면 호출하지 않는다', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <LoginButton brand="apple" onClick={onClick}>
        Apple로 계속하기
      </LoginButton>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <LoginButton brand="apple" onClick={onClick} disabled>
        Apple로 계속하기
      </LoginButton>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled일 때 button이 비활성으로 보고된다', () => {
    render(
      <LoginButton brand="google" disabled>
        Google로 계속하기
      </LoginButton>,
    );

    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });
});
