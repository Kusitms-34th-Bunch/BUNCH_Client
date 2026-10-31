import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BunchListItem } from './BunchListItem';

afterEach(cleanup);

describe('BunchListItem', () => {
  it('번치 이름이 버튼 이름이고 누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<BunchListItem name="여행가조" badge={<span>알림 5개</span>} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '여행가조 , 알림 5개' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('지금 보고 있는 번치는 현재 항목으로 알리고, 초점은 받지만 고를 수 없다', () => {
    const onClick = vi.fn();
    render(<BunchListItem name="퇴근런클럽" status="current" onClick={onClick} />);
    const button = screen.getByRole('button', { name: /퇴근런클럽.*현재 번치/ });

    button.focus();
    fireEvent.click(button);

    expect(button.getAttribute('aria-current')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('접근 불가 번치는 고를 수 없다', () => {
    const onClick = vi.fn();
    render(
      <BunchListItem
        name="홍대 먹짱"
        status="unavailable"
        badge={<span>접근 불가</span>}
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /홍대 먹짱/ }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
