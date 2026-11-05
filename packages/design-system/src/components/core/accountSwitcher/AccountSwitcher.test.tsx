import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccountSwitcher } from './AccountSwitcher';

describe('AccountSwitcher', () => {
  it('계정 이름이 버튼의 접근성 이름이 된다', () => {
    render(<AccountSwitcher label="여행가조" />);

    expect(screen.getByRole('button', { name: '여행가조' })).toBeTruthy();
  });

  it('누르면 onClick을 호출하고 disabled면 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<AccountSwitcher label="여행가조" onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<AccountSwitcher label="여행가조" onClick={onClick} disabled />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('긴 계정 이름도 한 줄로 자른다', () => {
    render(<AccountSwitcher label="아주아주아주아주긴계정이름입니다" />);

    expect(screen.getByText('아주아주아주아주긴계정이름입니다').className).toContain('truncate');
  });

  it('avatarSrc가 없으면 색종이 아이콘을 그린다', () => {
    const { container } = render(<AccountSwitcher label="여행가조" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  it('avatarSrc가 있으면 28px 원형 이미지를 장식으로 그리고 이름에는 쓰지 않는다', () => {
    const { container } = render(<AccountSwitcher label="여행가조" avatarSrc="/images/a.png" />);
    const wrapper = container.querySelector('span[aria-hidden="true"]') as HTMLElement;
    const image = container.querySelector('img') as HTMLImageElement;

    expect(image.getAttribute('src')).toBe('/images/a.png');
    expect(image.getAttribute('alt')).toBe('');
    expect(wrapper.className).toContain('size-7');
    expect(wrapper.className).toContain('rounded-full');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '여행가조' })).toBeTruthy();
  });

  it('Figma 여백(p-s3, gap-s4)을 쓴다', () => {
    render(<AccountSwitcher label="여행가조" />);
    const { className } = screen.getByRole('button');

    expect(className).toContain('p-s3');
    expect(className).toContain('gap-s4');
  });
});
