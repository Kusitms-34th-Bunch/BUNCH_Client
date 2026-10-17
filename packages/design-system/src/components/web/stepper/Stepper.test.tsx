import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stepper } from './Stepper';

describe('Stepper', () => {
  it('진행 상황을 progressbar 값과 읽을 수 있는 글자로 전달한다', () => {
    render(<Stepper total={3} current={1} />);

    const bar = screen.getByRole('progressbar', { name: '진행 단계' });
    expect(bar.getAttribute('aria-valuenow')).toBe('1');
    expect(bar.getAttribute('aria-valuemax')).toBe('3');
    expect(bar.getAttribute('aria-valuetext')).toBe('3단계 중 1단계');
    expect(bar.getAttribute('aria-valuemin')).toBe('1');
    expect(
      Array.from(bar.children).every((item) => item.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
  });

  it('단계 수만큼 막대를 그리고 현재 단계의 막대만 채운다', () => {
    render(<Stepper total={3} current={2} />);

    const items = Array.from(screen.getByRole('progressbar').children);
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.className.includes('bg-surface-brand-subtle-2'))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('범위를 벗어난 현재 단계는 1과 전체 사이로 맞춘다', () => {
    const { rerender } = render(<Stepper total={3} current={9} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('3');

    rerender(<Stepper total={3} current={0} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
  });

  it('보정한 값으로 읽을 글자도 만든다', () => {
    render(<Stepper total={3} current={9} />);

    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('3단계 중 3단계');
  });

  it('유효하지 않은 숫자는 1단계짜리로 그린다', () => {
    render(<Stepper total={Number.NaN} current={Number.POSITIVE_INFINITY} />);

    const bar = screen.getByRole('progressbar');
    expect(bar.children).toHaveLength(1);
    expect(bar.getAttribute('aria-valuenow')).toBe('1');
    expect(bar.getAttribute('aria-valuemax')).toBe('1');
  });

  it('이름과 읽을 글자를 바꿀 수 있다', () => {
    render(<Stepper total={4} current={2} aria-label="가입 단계" aria-valuetext="2/4" />);

    const bar = screen.getByRole('progressbar', { name: '가입 단계' });
    expect(bar.getAttribute('aria-valuetext')).toBe('2/4');
  });
});
