import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InviteCard } from './InviteCard';

const props = {
  bunchName: '여행가조',
  description: '틈만 나면 떠나는 여행 좋아하는 네 명',
  senderName: '민지',
};

describe('InviteCard', () => {
  it('번치 이름을 제목으로 하는 article이다', () => {
    render(<InviteCard {...props} />);

    expect(screen.getByRole('article', { name: '여행가조' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: '여행가조' })).toBeTruthy();
  });

  it('소개와 보낸 사람을 보여 준다', () => {
    render(<InviteCard {...props} />);

    expect(screen.getByText('틈만 나면 떠나는 여행 좋아하는 네 명')).toBeTruthy();
    expect(screen.getByText('From.').parentElement?.textContent).toBe('From. 민지 님');
  });

  it('참여하기를 누르면 onJoin을 한 번 호출한다', async () => {
    const onJoin = vi.fn();
    render(<InviteCard {...props} onJoin={onJoin} />);

    await userEvent.click(screen.getByRole('button', { name: '참여하기' }));

    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it('imageSrc가 있으면 이미지를 그리고 alt를 비우면 장식으로 숨긴다', () => {
    const { container, rerender } = render(<InviteCard {...props} imageSrc="/bunch.png" />);

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/bunch.png');
    expect(screen.queryByRole('img')).toBeNull();

    rerender(<InviteCard {...props} imageSrc="/bunch.png" imageAlt="여행가조 대표 이미지" />);
    expect(screen.getByRole('img', { name: '여행가조 대표 이미지' })).toBeTruthy();
  });

  it('imageSrc가 없으면 이미지 없이 빈 원만 그린다', () => {
    const { container } = render(<InviteCard {...props} />);

    expect(container.querySelector('img')).toBeNull();
  });

  it('카드가 둘이어도 제목 연결이 섞이지 않는다', () => {
    render(
      <>
        <InviteCard {...props} />
        <InviteCard {...props} bunchName="퇴근런클럽" />
      </>,
    );

    expect(screen.getByRole('article', { name: '여행가조' })).toBeTruthy();
    expect(screen.getByRole('article', { name: '퇴근런클럽' })).toBeTruthy();
  });

  it('className을 카드에 전달한다', () => {
    render(<InviteCard {...props} className="custom" />);

    expect(screen.getByRole('article').className).toContain('custom');
  });
});
