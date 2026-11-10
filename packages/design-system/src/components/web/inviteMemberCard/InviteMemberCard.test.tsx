import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InviteMemberCard } from './InviteMemberCard';

describe('InviteMemberCard', () => {
  it('제목과 설명이 버튼의 이름이 된다', () => {
    render(
      <InviteMemberCard title="멤버 초대하기" description="친구를 초대해 함께 시작해 보세요" />,
    );

    expect(
      screen.getByRole('button', { name: '멤버 초대하기 친구를 초대해 함께 시작해 보세요' }),
    ).toBeTruthy();
  });

  it('누르면 onClick을 호출한다', async () => {
    const onClick = vi.fn();
    render(<InviteMemberCard title="멤버 초대하기" description="설명" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Enter와 Space로도 누를 수 있다', async () => {
    const onClick = vi.fn();
    render(<InviteMemberCard title="멤버 초대하기" description="설명" onClick={onClick} />);
    screen.getByRole('button').focus();

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('form 안에서 눌러도 제출하지 않는다', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <InviteMemberCard title="제목" description="설명" />
      </form>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('화살표 아이콘은 이름에 포함되지 않고 className·ref는 버튼에 전달한다', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<InviteMemberCard title="제목" description="설명" className="custom" ref={ref} />);

    const button = screen.getByRole('button', { name: '제목 설명' });
    expect(button.classList.contains('custom')).toBe(true);
    expect(ref.current).toBe(button);
    expect(button.querySelector('svg')?.getAttribute('role')).toBeNull();
  });
});
