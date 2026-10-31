import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageCounter } from './PageCounter';

describe('PageCounter', () => {
  it('현재와 전체를 "1/4" 모양으로 보여 준다', () => {
    const { container } = render(<PageCounter current={1} total={4} />);

    expect(container.textContent).toBe('1/4');
  });

  it('기본 이름은 "{현재} / {전체}"이고 화면의 글자는 숨겨 중복해서 읽히지 않는다', () => {
    const { container } = render(<PageCounter current={2} total={4} />);

    expect(screen.getByRole('img', { name: '2 / 4' })).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('2/4');
  });

  it('label로 읽어 주는 글자를 바꾸고, 빈 문자열이면 기본 글자로 대체한다', () => {
    const { rerender } = render(<PageCounter current={1} total={4} label="사진 4장 중 1번째" />);

    expect(screen.getByRole('img', { name: '사진 4장 중 1번째' })).toBeTruthy();

    rerender(<PageCounter current={1} total={4} label="" />);

    expect(screen.getByRole('img', { name: '1 / 4' })).toBeTruthy();
  });

  it('반투명 검정 알약 모양이다(rounded-full, 블러 5px, 좌우 12px·위아래 4px)', () => {
    render(<PageCounter current={1} total={4} />);
    const { classList } = screen.getByRole('img');

    expect(classList.contains('rounded-full')).toBe(true);
    expect(classList.contains('backdrop-blur-[5px]')).toBe(true);
    expect(classList.contains('px-s6')).toBe(true);
    expect(classList.contains('py-s2')).toBe(true);
    expect(classList.contains('typography-body-4-regular')).toBe(true);
    expect(classList.contains('text-text-inversed')).toBe(true);
  });

  it('className과 span 속성이 알약에 합쳐진다', () => {
    render(<PageCounter current={1} total={4} className="absolute" data-testid="counter" />);

    expect(screen.getByTestId('counter').classList.contains('absolute')).toBe(true);
    expect(screen.getByTestId('counter').classList.contains('rounded-full')).toBe(true);
  });
});
