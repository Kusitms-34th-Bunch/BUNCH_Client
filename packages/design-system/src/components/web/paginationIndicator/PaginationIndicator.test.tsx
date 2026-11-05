import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getPaginationDotStates } from './paginationDots.internal';
import { PaginationIndicator, type PaginationIndicatorProps } from './PaginationIndicator';

/** active·middle·far를 한 글자(A·M·F)로 줄여 모양을 비교 */
const shape = (total: number, current: number) =>
  getPaginationDotStates(total, current)
    .map((state) => ({ active: 'A', middle: 'M', far: 'F' })[state])
    .join('');

const renderIndicator = (props: PaginationIndicatorProps) =>
  render(<PaginationIndicator {...props} />);

describe('getPaginationDotStates', () => {
  it('페이지가 6개를 넘으면 Figma CurrentPage 1~6의 여섯 모양이 나온다', () => {
    // total 8에서 현재 1·2·3·4·7·8이 Figma CurrentPage 1·2·3·4·5·6에 해당
    expect(shape(8, 1)).toBe('AMMMMF');
    expect(shape(8, 2)).toBe('MAMMMF');
    expect(shape(8, 3)).toBe('MMAMMF');
    expect(shape(8, 4)).toBe('FMMAMF');
    expect(shape(8, 7)).toBe('FMMMAF');
    expect(shape(8, 8)).toBe('FMMMMA');
  });

  it('중간 페이지는 모두 네 번째 점이 active이고 양쪽 끝이 far다', () => {
    expect(shape(10, 5)).toBe('FMMAMF');
    expect(shape(10, 6)).toBe('FMMAMF');
    expect(shape(10, 7)).toBe('FMMAMF');
    expect(shape(10, 8)).toBe('FMMAMF');
    expect(shape(10, 9)).toBe('FMMMAF');
    expect(shape(10, 10)).toBe('FMMMMA');
  });

  it('페이지가 정확히 7개여도 같은 규칙이다', () => {
    expect(shape(7, 3)).toBe('MMAMMF');
    expect(shape(7, 4)).toBe('FMMAMF');
    expect(shape(7, 5)).toBe('FMMAMF');
    expect(shape(7, 6)).toBe('FMMMAF');
    expect(shape(7, 7)).toBe('FMMMMA');
  });

  it('페이지가 6개 이하면 점마다 한 페이지이고 far가 없다', () => {
    expect(shape(6, 1)).toBe('AMMMMM');
    expect(shape(6, 4)).toBe('MMMAMM');
    expect(shape(6, 6)).toBe('MMMMMA');
    expect(shape(3, 2)).toBe('MAM');
    expect(shape(1, 1)).toBe('A');
  });

  it('페이지가 없으면 점이 없다', () => {
    expect(getPaginationDotStates(0, 1)).toEqual([]);
    expect(getPaginationDotStates(-3, 1)).toEqual([]);
  });

  it('현재 페이지가 범위를 벗어나면 가장 가까운 페이지로 맞춘다', () => {
    expect(shape(8, 0)).toBe('AMMMMF');
    expect(shape(8, 99)).toBe('FMMMMA');
    expect(shape(3, 5)).toBe('MMA');
  });

  it('숫자가 아니거나 무한한 current는 첫 페이지로, 그런 total은 페이지 없음으로 본다', () => {
    expect(shape(8, Number.NaN)).toBe('AMMMMF');
    expect(shape(8, Number.POSITIVE_INFINITY)).toBe('AMMMMF');
    expect(getPaginationDotStates(Number.NaN, 1)).toEqual([]);
    expect(getPaginationDotStates(Number.POSITIVE_INFINITY, 1)).toEqual([]);
  });

  it('소수 입력은 내림해서 쓴다', () => {
    expect(shape(8.9, 2.7)).toBe('MAMMMF');
  });
});

describe('PaginationIndicator', () => {
  it('점 묶음 하나가 이미지로 읽히고 이름은 "{현재} / {전체}"다', () => {
    renderIndicator({ total: 8, current: 3 });

    expect(screen.getByRole('img', { name: '3 / 8' })).toBeTruthy();
  });

  it('빈 문자열 label은 이름 없는 이미지가 되지 않도록 기본 글자로 읽힌다', () => {
    renderIndicator({ total: 8, current: 2, label: '' });

    expect(screen.getByRole('img', { name: '2 / 8' })).toBeTruthy();
  });

  it('숫자가 아닌 current도 이름에 NaN이 나오지 않는다', () => {
    renderIndicator({ total: 8, current: Number.NaN });

    expect(screen.getByRole('img', { name: '1 / 8' })).toBeTruthy();
  });

  it('label로 읽는 글자를 바꾼다', () => {
    renderIndicator({ total: 8, current: 3, label: '8페이지 중 3페이지' });

    expect(screen.getByRole('img', { name: '8페이지 중 3페이지' })).toBeTruthy();
  });

  it('범위를 벗어난 current는 이름에도 맞춰진 값으로 읽힌다', () => {
    renderIndicator({ total: 3, current: 9 });

    expect(screen.getByRole('img', { name: '3 / 3' })).toBeTruthy();
  });

  it('점 6개를 4px 간격(gap-s2)으로 그리고 각 점은 숨겨진다', () => {
    renderIndicator({ total: 8, current: 1 });
    const group = screen.getByRole('img');

    expect(group.classList.contains('gap-s2')).toBe(true);
    expect(group.children).toHaveLength(6);
    for (const dot of group.children) {
      expect(dot.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('active 점은 하나이고 far는 4px, 나머지는 6px다', () => {
    renderIndicator({ total: 8, current: 4 });
    const dots = [...screen.getByRole('img').children];

    expect(dots.filter((dot) => dot.classList.contains('bg-icon-tertiary'))).toHaveLength(1);
    expect(dots[0]?.classList.contains('size-1')).toBe(true);
    expect(dots[5]?.classList.contains('size-1')).toBe(true);
    expect(dots[3]?.classList.contains('size-1.5')).toBe(true);
  });

  it('total이 0이면 아무것도 그리지 않는다', () => {
    const { container } = renderIndicator({ total: 0, current: 1 });

    expect(container.firstElementChild).toBeNull();
  });

  it('className과 div 속성이 합쳐진다', () => {
    renderIndicator({ total: 3, current: 1, className: 'mt-2', 'data-testid': 'dots' } as never);
    const group = screen.getByTestId('dots');

    expect(group.className).toContain('mt-2');
  });
});
