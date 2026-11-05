import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemberCard, type MemberCardProps } from './MemberCard';

const renderCard = (props?: Partial<MemberCardProps>) =>
  render(<MemberCard name="지예" src="avatar.png" {...props} />);

describe('MemberCard', () => {
  it('이름과 프로필 사진을 보여 준다', () => {
    const { container } = renderCard();

    expect(screen.getByText('지예')).toBeTruthy();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('avatar.png');
  });

  it('src가 없으면 사진 없이 배경 원만 그린다', () => {
    const { container } = renderCard({ src: undefined });

    expect(container.querySelector('img')).toBeNull();
  });

  it('카드는 폭 76px(w-19)에 secondary 배경, 반경 r4다', () => {
    const { container } = renderCard();
    const card = container.firstElementChild as HTMLElement;

    expect(card.classList.contains('w-19')).toBe(true);
    expect(card.classList.contains('bg-surface-secondary')).toBe(true);
    expect(card.classList.contains('rounded-r4')).toBe(true);
  });

  it('프로필 사진은 40px 원에 테두리가 있다', () => {
    const { container } = renderCard();
    const profile = container.firstElementChild?.firstElementChild as HTMLElement;

    expect(profile.classList.contains('size-10')).toBe(true);
    // ProfileImage 기본 90px 크기가 남지 않고 덮여야 함
    expect(profile.classList.contains('size-22.5')).toBe(false);
    expect(profile.classList.contains('border-border-tertiary')).toBe(true);
  });

  it('memberRole이 없으면 역할 배지가 없다', () => {
    const { container } = renderCard();

    expect(container.querySelector('svg')).toBeNull();
  });

  it('memberRole을 주면 배지가 장식으로 그려지고 roleLabel을 주면 이미지로 읽힌다', () => {
    const { container, rerender } = renderCard({ memberRole: 'owner' });

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    rerender(<MemberCard name="지예" memberRole="owner" roleLabel="번치장" />);

    expect(screen.getByRole('img', { name: '번치장' })).toBeTruthy();
  });

  it('onDelete가 없으면 삭제 버튼이 없다', () => {
    renderCard();

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('onDelete를 주면 "{이름} 삭제" 버튼이 생기고 누르면 호출된다', () => {
    const onDelete = vi.fn();
    renderCard({ onDelete });
    const button = screen.getByRole('button', { name: '지예 삭제' });

    expect(button.getAttribute('type')).toBe('button');

    fireEvent.click(button);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('deleteLabel로 삭제 버튼 이름을 바꾸고 아이콘은 숨긴다', () => {
    const { container } = renderCard({ onDelete: () => {}, deleteLabel: 'Remove Jiye' });

    expect(screen.getByRole('button', { name: 'Remove Jiye' })).toBeTruthy();
    expect(container.querySelector('button svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('삭제 버튼은 오른쪽 위에 16px 원이고 터치 영역을 넓혔다', () => {
    renderCard({ onDelete: () => {} });
    const { classList } = screen.getByRole('button');

    expect(classList.contains('size-4')).toBe(true);
    expect(classList.contains('rounded-full')).toBe(true);
    expect(classList.contains('-top-0.75')).toBe(true);
    expect(classList.contains('-right-0.75')).toBe(true);
    expect(classList.contains('before:-inset-2')).toBe(true);
    expect(classList.contains('focus-visible:outline-2')).toBe(true);
    expect(classList.contains('focus-visible:outline-border-brand')).toBe(true);
  });

  it('className과 div 속성이 카드에 합쳐진다', () => {
    const { container } = renderCard({ className: 'mt-2', 'data-testid': 'card' } as never);

    expect((container.firstElementChild as HTMLElement).className).toContain('mt-2');
    expect(screen.getByTestId('card')).toBeTruthy();
  });
});
