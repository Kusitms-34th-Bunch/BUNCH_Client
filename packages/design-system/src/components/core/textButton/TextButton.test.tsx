import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextButton } from './TextButton';

describe('TextButton', () => {
  it('글자를 이름으로 가진 button으로 렌더링한다', () => {
    render(<TextButton>더보기</TextButton>);

    expect(screen.getByRole('button', { name: '더보기' })).toBeTruthy();
  });

  it('type을 지정하지 않으면 form 안에서도 제출하지 않는 button이다', () => {
    render(<TextButton>더보기</TextButton>);

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('필요하면 type을 submit으로 바꿀 수 있다', () => {
    render(<TextButton type="submit">제출</TextButton>);

    expect(screen.getByRole('button').getAttribute('type')).toBe('submit');
  });

  it('누르면 onClick을 호출한다', () => {
    const onClick = vi.fn();
    render(<TextButton onClick={onClick}>더보기</TextButton>);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('비활성이면 누를 수 없고 보조 기술에도 비활성으로 전달된다', () => {
    const onClick = vi.fn();
    render(
      <TextButton disabled onClick={onClick}>
        더보기
      </TextButton>,
    );

    const button = screen.getByRole<HTMLButtonElement>('button', { name: '더보기' });
    fireEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('아이콘은 장식이라 접근성 이름에 들어가지 않는다', () => {
    render(
      <TextButton leftIcon={<svg data-testid="left" />} rightIcon={<svg data-testid="right" />}>
        다음
      </TextButton>,
    );

    expect(screen.getByRole('button', { name: '다음' })).toBeTruthy();
    expect(screen.getByTestId('left').closest('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByTestId('right').closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('아이콘을 주지 않으면 아이콘 영역을 만들지 않는다', () => {
    const { container } = render(<TextButton>더보기</TextButton>);

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('호출하는 쪽의 className과 native 속성을 그대로 전달한다', () => {
    render(
      <TextButton className="w-full" aria-label="더보기 열기" data-testid="more">
        더보기
      </TextButton>,
    );

    const button = screen.getByTestId('more');

    expect(button.className).toContain('w-full');
    expect(button.getAttribute('aria-label')).toBe('더보기 열기');
  });

  it('호출하는 쪽의 className이 토큰 class를 덮어쓴다', () => {
    render(
      <TextButton size="lg" className="h-10 px-4" data-testid="custom">
        더보기
      </TextButton>,
    );

    const classes = screen.getByTestId('custom').className.split(' ');

    expect(classes).toContain('h-10');
    expect(classes).not.toContain('h-s18');
    expect(classes).not.toContain('px-s12');
  });

  it('variant를 주지 않으면 secondary 글자색을 쓴다', () => {
    render(<TextButton>더보기</TextButton>);

    expect(screen.getByRole('button').className.split(' ')).toContain('text-text-secondary');
  });

  it.each([
    ['primary', 'text-text-brand'],
    ['secondary', 'text-text-secondary'],
    ['warning', 'text-system-fail-fg'],
  ] as const)('%s variant는 %s 글자색을 쓴다', (variant, color) => {
    render(<TextButton variant={variant}>확인</TextButton>);

    expect(screen.getByRole('button').className.split(' ')).toContain(color);
  });

  it.each(['primary', 'secondary', 'warning'] as const)(
    '%s variant의 눌림 오버레이는 모두 10%(overlay-hover)다',
    (variant) => {
      render(<TextButton variant={variant}>확인</TextButton>);

      const classes = screen.getByRole('button').className.split(' ');

      expect(classes).toContain('before:bg-overlay-hover');
      expect(classes).not.toContain('before:bg-overlay-pressed');
    },
  );

  it('비활성이 아닐 때만 눌림 오버레이를 켜고 비활성 글자색은 text-disabled다', () => {
    render(<TextButton>확인</TextButton>);

    const classes = screen.getByRole('button').className.split(' ');

    expect(classes).toContain('not-disabled:active:before:opacity-100');
    expect(classes).toContain('disabled:text-text-disabled');
  });

  it.each([
    ['lg', 'h-s18'],
    ['md', 'h-s16'],
    ['sm', 'h-s14'],
  ] as const)('%s 크기는 %s 높이를 쓴다', (size, height) => {
    render(<TextButton size={size}>확인</TextButton>);

    expect(screen.getByRole('button').className.split(' ')).toContain(height);
  });

  it('긴 글자도 버튼 폭 안에서 잘리도록 글자 영역이 줄어들 수 있다', () => {
    render(<TextButton>아주 아주 긴 버튼 이름이 들어오는 경우</TextButton>);

    const label = screen.getByText('아주 아주 긴 버튼 이름이 들어오는 경우');

    expect(label.className).toContain('truncate');
    expect(label.className).toContain('min-w-0');
  });
});
