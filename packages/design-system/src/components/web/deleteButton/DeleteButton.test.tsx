import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeleteButton } from './DeleteButton';

describe('DeleteButton', () => {
  it('button이고 이름은 label이며 type이 button이다', () => {
    render(<DeleteButton label="사진 삭제" />);
    const button = screen.getByRole('button', { name: '사진 삭제' });
    expect(button.getAttribute('type')).toBe('button');
  });

  it('누르면 onClick을 호출한다', () => {
    const onClick = vi.fn();
    render(<DeleteButton label="삭제" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('X 아이콘은 장식이라 이름에 영향이 없다', () => {
    const { container } = render(<DeleteButton label="삭제" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('기본은 M 16px 원이고 icon-tertiary 배경이다', () => {
    render(<DeleteButton label="삭제" />);
    const { classList } = screen.getByRole('button');
    expect(classList.contains('size-4')).toBe(true);
    expect(classList.contains('rounded-full')).toBe(true);
    expect(classList.contains('bg-icon-tertiary')).toBe(true);
    expect(classList.contains('text-icon-inversed')).toBe(true);
  });

  it('L은 24px 원이다', () => {
    render(<DeleteButton label="삭제" size="L" />);
    const { classList } = screen.getByRole('button');
    expect(classList.contains('size-6')).toBe(true);
    expect(classList.contains('size-4')).toBe(false);
  });

  it('overlay는 scrim 배경과 블러 15px이고 icon-tertiary 배경이 아니다', () => {
    render(<DeleteButton label="삭제" variant="overlay" />);
    const { classList } = screen.getByRole('button');
    expect(classList.contains('bg-overlay-scrim')).toBe(true);
    expect(classList.contains('backdrop-blur-[15px]')).toBe(true);
    expect(classList.contains('bg-icon-tertiary')).toBe(false);
  });

  it.each([
    ['M', 'before:-inset-2'],
    ['L', 'before:-inset-1'],
  ] as const)('%s 크기는 32px 터치 영역(%s)이다', (size, inset) => {
    render(<DeleteButton label="삭제" size={size} />);
    expect(screen.getByRole('button').classList.contains(inset)).toBe(true);
  });

  it.each([
    ['M', 'size-3'],
    ['L', 'size-4'],
  ] as const)('%s 크기의 X 아이콘은 %s이고 선 굵기를 1px로 고정한다', (size, iconSize) => {
    const { container } = render(<DeleteButton label="삭제" size={size} />);
    const classList = container.querySelector('svg')?.classList;
    expect(classList?.contains(iconSize)).toBe(true);
    expect(classList?.contains('[&_path]:stroke-1')).toBe(true);
    expect(classList?.contains('[&_path]:[vector-effect:non-scaling-stroke]')).toBe(true);
  });

  it('포커스 링은 2px border-brand outline이다', () => {
    render(<DeleteButton label="삭제" />);
    const { classList } = screen.getByRole('button');
    expect(classList.contains('focus-visible:outline-2')).toBe(true);
    expect(classList.contains('focus-visible:outline-border-brand')).toBe(true);
  });

  it('className으로 위치를 정하고 button 속성을 전달한다', () => {
    render(<DeleteButton label="삭제" className="absolute -top-0.75" data-testid="x" />);
    const button = screen.getByTestId('x');
    expect(button.classList.contains('absolute')).toBe(true);
    expect(button.classList.contains('relative')).toBe(false);
    expect(button.classList.contains('-top-0.75')).toBe(true);
  });
});
