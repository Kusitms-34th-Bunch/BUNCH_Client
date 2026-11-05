import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InviteMemberCard } from './InviteMemberCard';

const icon = <svg data-testid="icon" />;

describe('InviteMemberCard', () => {
  it('제목을 이름으로, 설명을 부가 설명으로 가진 라디오다', () => {
    render(
      <InviteMemberCard
        name="start"
        title="멤버 초대하기"
        description="친구에게 초대 링크를 보내 바로 함께 시작해요."
        icon={icon}
      />,
    );

    const radio = screen.getByRole('radio', { name: '멤버 초대하기' });
    expect(document.getElementById(radio.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      '친구에게 초대 링크를 보내 바로 함께 시작해요.',
    );
  });

  it('카드 어디를 눌러도 선택되고 onChange가 호출된다', async () => {
    const onChange = vi.fn();
    render(
      <InviteMemberCard
        name="start"
        title="멤버 초대하기"
        description="친구에게 초대 링크를 보내 바로 함께 시작해요."
        icon={icon}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByText('친구에게 초대 링크를 보내 바로 함께 시작해요.'));

    expect(screen.getByRole('radio')).toHaveProperty('checked', true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('아이콘은 접근성에서 숨기고 className은 카드에 전달한다', () => {
    const { container } = render(
      <InviteMemberCard
        name="start"
        title="멤버 초대하기"
        description="설명"
        icon={icon}
        className="custom"
      />,
    );

    expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).toBeTruthy();
    expect(container.querySelector('label')?.className).toContain('custom');
  });
});
