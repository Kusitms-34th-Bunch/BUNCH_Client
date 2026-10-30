import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChipButton } from './ChipButton';

describe('ChipButton', () => {
  it('button이고 이름은 글자이며 type이 button이다', () => {
    render(<ChipButton>서울특별시</ChipButton>);
    const chip = screen.getByRole('button', { name: '서울특별시' });
    expect(chip.getAttribute('type')).toBe('button');
  });

  it('누르면 onClick을 호출한다', () => {
    const onClick = vi.fn();
    render(<ChipButton onClick={onClick}>서울특별시</ChipButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['S', 'h-8'],
    ['M', 'h-9'],
    ['L', 'h-9.5'],
  ] as const)('%s 크기는 %s 높이다', (size, height) => {
    render(<ChipButton size={size}>칩</ChipButton>);
    expect(screen.getByRole('button').className).toContain(height);
  });

  it('solid 기본은 회색 채움이고 호버에 오버레이가 켜진다', () => {
    render(<ChipButton>칩</ChipButton>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('bg-surface-secondary');
    expect(cls).toContain('text-text-tertiary');
    expect(cls).toContain('hover:before:opacity-100');
    expect(cls).toContain('before:bg-overlay-hover');
  });

  it('outline 기본은 흰 배경+테두리이고 호버 변화가 없다', () => {
    render(<ChipButton variant="outline">칩</ChipButton>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('bg-surface-primary');
    expect(cls).toContain('border-border-tertiary');
    expect(cls).not.toContain('hover:before:opacity-100');
  });

  it('avatar 호버는 흰색 기준 오버레이다', () => {
    render(<ChipButton variant="avatar">칩</ChipButton>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('bg-surface-secondary');
    expect(cls).toContain('hover:bg-surface-primary');
    expect(cls).toContain('hover:before:opacity-100');
  });

  it.each([
    ['S', 'pl-s2 pr-s4'],
    ['M', 'pl-s3 pr-s4'],
    ['L', 'pl-s4 pr-s5'],
  ] as const)('avatar %s 크기의 여백은 %s다', (size, padding) => {
    render(
      <ChipButton variant="avatar" size={size}>
        칩
      </ChipButton>,
    );
    const cls = screen.getByRole('button').className;
    for (const token of padding.split(' ')) expect(cls).toContain(token);
  });

  it('선택되면 어두운 배경·흰 글자·aria-pressed=true이고 호버 변화가 없다', () => {
    render(<ChipButton selected>칩</ChipButton>);
    const chip = screen.getByRole('button');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(chip.className).toContain('bg-surface-inversed');
    expect(chip.className).toContain('text-text-inversed');
    expect(chip.className).not.toContain('hover:before:opacity-100');
  });

  it('outline 선택은 어두운 테두리다', () => {
    render(
      <ChipButton variant="outline" selected>
        칩
      </ChipButton>,
    );
    expect(screen.getByRole('button').className).toContain('border-surface-inversed');
  });

  it('avatar 선택은 호버 배경 변화가 없다', () => {
    render(
      <ChipButton variant="avatar" selected>
        칩
      </ChipButton>,
    );
    expect(screen.getByRole('button').className).not.toContain('hover:bg-surface-primary');
  });

  it('count를 주면 이름 뒤에 (숫자)가 붙는다', () => {
    render(<ChipButton count={3}>서울특별시</ChipButton>);
    expect(screen.getByRole('button', { name: '서울특별시 (3)' })).toBeTruthy();
  });

  it('count가 0이어도 그린다', () => {
    render(<ChipButton count={0}>서울특별시</ChipButton>);
    expect(screen.getByRole('button', { name: '서울특별시 (0)' })).toBeTruthy();
  });

  it('아이콘은 장식이라 이름에 영향이 없고 크기에 맞는 아이콘을 쓴다', () => {
    const { container, rerender } = render(
      <ChipButton leftIcon rightIcon>
        칩
      </ChipButton>,
    );
    expect(screen.getByRole('button', { name: '칩' })).toBeTruthy();
    const small = [...container.querySelectorAll('svg')].map((s) => s.getAttribute('width'));
    expect(small).toEqual(['16', '16']);

    rerender(
      <ChipButton size="L" leftIcon rightIcon>
        칩
      </ChipButton>,
    );
    const large = [...container.querySelectorAll('svg')].map((s) => s.getAttribute('width'));
    expect(large).toEqual(['20', '20']);
  });

  it('아이콘은 기본으로 그리지 않는다', () => {
    const { container } = render(<ChipButton>칩</ChipButton>);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('avatar는 왼쪽에 장식 원을 그리고 이미지는 alt가 비어 있다', () => {
    const { container } = render(
      <ChipButton variant="avatar" avatarSrc="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
        칩
      </ChipButton>,
    );
    const avatar = container.querySelector('[aria-hidden="true"].rounded-full') as HTMLElement;
    expect(avatar.className).toContain('size-6');
    expect(avatar.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('avatar에서는 왼쪽 × 아이콘 대신 원을 그린다', () => {
    const { container } = render(
      <ChipButton variant="avatar" leftIcon>
        칩
      </ChipButton>,
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('selected를 생략하면 aria-pressed를 달지 않는다', () => {
    render(<ChipButton>칩</ChipButton>);
    expect(screen.getByRole('button').hasAttribute('aria-pressed')).toBe(false);
  });

  it('selected={false}면 aria-pressed=false인 토글 칩이다', () => {
    render(<ChipButton selected={false}>칩</ChipButton>);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });

  it.each([
    ['S', 'after:-inset-y-1.5'],
    ['M', 'after:-inset-y-1'],
    ['L', 'after:-inset-y-0.75'],
  ] as const)('%s 크기는 위아래 터치 영역을 넓힌다(%s)', (size, cls) => {
    render(<ChipButton size={size}>칩</ChipButton>);
    expect(screen.getByRole('button').className).toContain(cls);
  });
});

describe('ChipButton 모션', () => {
  it('색과 오버레이는 Dissolve·Ease out·300ms로 바뀐다', () => {
    render(<ChipButton>칩</ChipButton>);
    const { classList } = screen.getByRole('button');
    expect(classList.contains('transition-colors')).toBe(true);
    expect(classList.contains('duration-300')).toBe(true);
    expect(classList.contains('ease-out')).toBe(true);
    expect(classList.contains('before:duration-300')).toBe(true);
    expect(classList.contains('before:duration-75')).toBe(false);
  });

  it('동작 줄이기에서는 전환을 끈다', () => {
    render(<ChipButton>칩</ChipButton>);
    const { classList } = screen.getByRole('button');
    expect(classList.contains('motion-reduce:transition-none')).toBe(true);
    expect(classList.contains('motion-reduce:before:transition-none')).toBe(true);
  });

  it('solid는 누르는 동안(active)에도 Hover 모양이다', () => {
    render(<ChipButton>칩</ChipButton>);
    expect(screen.getByRole('button').classList.contains('active:before:opacity-100')).toBe(true);
  });

  it('avatar는 누르는 동안 흰색 기준 Hover 모양이다', () => {
    render(<ChipButton variant="avatar">칩</ChipButton>);
    const { classList } = screen.getByRole('button');
    expect(classList.contains('active:before:opacity-100')).toBe(true);
    expect(classList.contains('active:bg-surface-primary')).toBe(true);
  });

  it('outline은 Figma Hover가 변하지 않아 누르는 동안에도 변화가 없다', () => {
    render(<ChipButton variant="outline">칩</ChipButton>);
    expect(screen.getByRole('button').className).not.toContain('active:');
  });

  it('선택된 칩은 누르는 동안에도 모양이 변하지 않는다', () => {
    render(
      <ChipButton selected variant="avatar">
        칩
      </ChipButton>,
    );
    expect(screen.getByRole('button').className).not.toContain('active:');
  });
});
