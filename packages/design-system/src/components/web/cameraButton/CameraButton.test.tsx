import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CameraButton } from './CameraButton';

describe('CameraButton', () => {
  it('접근성 이름을 가진 button으로 렌더링한다', () => {
    render(<CameraButton aria-label="프로필 사진 변경" />);

    expect(screen.getByRole('button', { name: '프로필 사진 변경' })).toBeTruthy();
  });

  it('type을 지정하지 않으면 form 안에서도 제출하지 않는 button이다', () => {
    render(<CameraButton aria-label="프로필 사진 변경" />);

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('누르면 onClick을 호출한다', async () => {
    const onClick = vi.fn();
    render(<CameraButton aria-label="프로필 사진 변경" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('키보드로 포커스해 Enter와 Space로 누를 수 있다', async () => {
    const onClick = vi.fn();
    render(<CameraButton aria-label="프로필 사진 변경" onClick={onClick} />);

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button'));
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('disabled면 누를 수 없고 onClick을 호출하지 않는다', async () => {
    const onClick = vi.fn();
    render(<CameraButton aria-label="프로필 사진 변경" onClick={onClick} disabled />);

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('아이콘은 화면 읽기에서 숨겨진다', () => {
    const { container } = render(<CameraButton aria-label="프로필 사진 변경" />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
