import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationCard } from './NotificationCard';

afterEach(cleanup);

const base = {
  title: '[퇴근런클럽] 번치가 삭제됐어요',
  description: '관리자에 의해 그룹이 영구 삭제되었습니다.',
  time: '방금 전',
};

describe('NotificationCard', () => {
  it('제목·시각·내용이 버튼의 접근성 이름이다', () => {
    render(<NotificationCard {...base} />);

    expect(
      screen.getByRole('button', {
        name: /^\[퇴근런클럽\] 번치가 삭제됐어요\s*,\s*방금 전\s*,\s*관리자에 의해 그룹이 영구 삭제되었습니다\.$/,
      }),
    ).toBeTruthy();
  });

  it('중요·읽지 않음을 색이 아닌 글자로도 전달한다', () => {
    render(<NotificationCard {...base} important unread />);

    expect(
      screen.getByRole('button', {
        name: /^중요\s*,\s*\[퇴근런클럽\].*방금 전\s*,\s*읽지 않음\s*,/,
      }),
    ).toBeTruthy();
  });

  it('숨은 글자를 빈 글자로 넘기면 기본 글자로 대체한다', () => {
    render(<NotificationCard {...base} important unread importantLabel="" unreadLabel="" />);

    expect(screen.getByRole('button', { name: /^중요\s*,.*읽지 않음/ })).toBeTruthy();
  });

  it('누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<NotificationCard {...base} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('비활성이면 초점은 받지만 onClick을 부르지 않는다', () => {
    const onClick = vi.fn();
    render(<NotificationCard {...base} disabled onClick={onClick} />);
    const button = screen.getByRole('button');

    button.focus();
    fireEvent.click(button);

    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(onClick).not.toHaveBeenCalled();
  });
});
