import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BunchLabel } from './BunchLabel';

describe('BunchLabel', () => {
  it('번치 이름이 버튼 이름이고 누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<BunchLabel name="퇴근런클럽" onClick={onClick} />);

    const button = screen.getByRole('button', { name: '퇴근런클럽' });
    expect(button.getAttribute('type')).toBe('button');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('이미지와 화살표는 장식이다', () => {
    const { container } = render(<BunchLabel name="독서모임" imageSrc="/bunch.png" />);

    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('비활성이면 누를 수 없다', () => {
    const onClick = vi.fn();
    render(<BunchLabel name="퇴근런클럽" disabled onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '퇴근런클럽' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
