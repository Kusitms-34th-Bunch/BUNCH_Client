import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('글자를 이름으로 가진 button으로 렌더링한다', () => {
    render(<Button>저장</Button>);

    expect(screen.getByRole('button', { name: '저장' })).toBeTruthy();
  });

  it('type을 지정하지 않으면 form 안에서도 제출하지 않는 button이다', () => {
    render(<Button>저장</Button>);

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('필요하면 type을 submit으로 바꿀 수 있다', () => {
    render(<Button type="submit">제출</Button>);

    expect(screen.getByRole('button').getAttribute('type')).toBe('submit');
  });

  it('누르면 onClick을 호출한다', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('비활성이면 누를 수 없고 보조 기술에도 비활성으로 전달된다', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        저장
      </Button>,
    );

    const button = screen.getByRole<HTMLButtonElement>('button', { name: '저장' });
    fireEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('아이콘은 장식이라 접근성 이름에 들어가지 않는다', () => {
    render(
      <Button leftIcon={<svg data-testid="left" />} rightIcon={<svg data-testid="right" />}>
        다음
      </Button>,
    );

    expect(screen.getByRole('button', { name: '다음' })).toBeTruthy();
    expect(screen.getByTestId('left').closest('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByTestId('right').closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('아이콘을 주지 않으면 아이콘 영역을 만들지 않는다', () => {
    const { container } = render(<Button>저장</Button>);

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('호출하는 쪽의 className과 native 속성을 그대로 전달한다', () => {
    render(
      <Button className="w-full" aria-label="저장하기" data-testid="save">
        저장
      </Button>,
    );

    const button = screen.getByTestId('save');

    expect(button.className).toContain('w-full');
    expect(button.getAttribute('aria-label')).toBe('저장하기');
  });

  it('호출하는 쪽의 className이 토큰 class를 덮어쓴다', () => {
    render(
      <Button size="lg" className="h-10 px-4" data-testid="custom">
        저장
      </Button>,
    );

    const classes = screen.getByTestId('custom').className.split(' ');

    expect(classes).toContain('h-10');
    expect(classes).not.toContain('h-s18');
    expect(classes).not.toContain('px-s12');
  });

  it('warning만 눌림 오버레이가 20%(overlay-pressed)이고 나머지는 10%(overlay-hover)다', () => {
    render(
      <>
        <Button variant="warning" data-testid="warning">
          삭제
        </Button>
        <Button variant="primary" data-testid="primary">
          저장
        </Button>
      </>,
    );

    const warning = screen.getByTestId('warning').className.split(' ');
    const primary = screen.getByTestId('primary').className.split(' ');

    expect(warning).toContain('before:bg-overlay-pressed');
    expect(warning).not.toContain('before:bg-overlay-hover');
    expect(primary).toContain('before:bg-overlay-hover');
    expect(primary).not.toContain('before:bg-overlay-pressed');
  });

  it.each([
    ['primary', 'bg-surface-inversed'],
    ['secondary', 'bg-surface-tertiary'],
    ['tertiary', 'bg-surface-primary'],
    ['warning', 'bg-surface-danger'],
    ['brand', 'bg-surface-brand'],
    ['brandSubtle', 'bg-surface-brand-subtle-1'],
  ] as const)('%s 변형은 %s 배경을 쓴다', (variant, background) => {
    render(<Button variant={variant}>확인</Button>);

    expect(screen.getByRole('button').className.split(' ')).toContain(background);
  });

  it.each([
    ['lg', 'h-s18'],
    ['md', 'h-s16'],
    ['sm', 'h-s14'],
  ] as const)('%s 크기는 %s 높이를 쓴다', (size, height) => {
    render(<Button size={size}>확인</Button>);

    expect(screen.getByRole('button').className.split(' ')).toContain(height);
  });

  it('tertiary는 비활성에서 테두리를 투명하게 둬서 크기가 변하지 않는다', () => {
    render(<Button variant="tertiary">확인</Button>);

    expect(screen.getByRole('button').className.split(' ')).toContain(
      'disabled:border-transparent',
    );
  });

  it('긴 글자도 버튼 폭 안에서 잘리도록 글자 영역이 줄어들 수 있다', () => {
    render(<Button>아주 아주 긴 버튼 이름이 들어오는 경우</Button>);

    const label = screen.getByText('아주 아주 긴 버튼 이름이 들어오는 경우');

    expect(label.className).toContain('truncate');
    expect(label.className).toContain('min-w-0');
  });
});
