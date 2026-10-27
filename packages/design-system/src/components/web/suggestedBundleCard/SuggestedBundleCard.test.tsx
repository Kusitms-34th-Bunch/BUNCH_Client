import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SuggestedBundleCard, type SuggestedBundleCardProps } from './SuggestedBundleCard';

const BASE: SuggestedBundleCardProps = {
  imageSrc: 'photo.png',
  title: '성수동 러닝 모임',
  members: ['지예', '경진', '수인'],
  photoCount: 8,
  month: 8,
  day: 28,
};

const renderCard = (props?: Partial<SuggestedBundleCardProps>) =>
  render(<SuggestedBundleCard {...BASE} {...props} />);

describe('SuggestedBundleCard', () => {
  it('번들 이름·멤버·사진 수·날짜를 보여 준다', () => {
    renderCard();

    expect(screen.getByRole('button', { name: '성수동 러닝 모임' })).toBeTruthy();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '지예',
      '경진',
      '수인',
    ]);
    expect(screen.getByText('8장')).toBeTruthy();
    expect(screen.getByText('8월 28일')).toBeTruthy();
  });

  it('대표 사진은 기본으로 장식이고 imageAlt를 주면 이름을 갖는다', () => {
    const { container, rerender } = renderCard();

    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('photo.png');

    rerender(<SuggestedBundleCard {...BASE} imageAlt="한강 러닝" />);

    expect(screen.getByRole('img', { name: '한강 러닝' })).toBeTruthy();
  });

  it('멤버가 maxVisibleMembers를 넘으면 마지막 칩이 마지막 멤버 외 N명이 된다', () => {
    renderCard({ members: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] });

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f 외 2명',
    ]);
  });

  it('maxVisibleMembers를 바꾸면 그 수만큼만 칩으로 보인다', () => {
    renderCard({ members: ['a', 'b', 'c', 'd'], maxVisibleMembers: 2 });

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'a',
      'b 외 2명',
    ]);
  });

  it('멤버가 딱 maxVisibleMembers면 외 N명 칩이 없다', () => {
    renderCard({ members: ['a', 'b', 'c', 'd', 'e', 'f'] });

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByText(/ 외 /)).toBeNull();
  });

  it('selected가 아니면 aria-pressed가 false이고 칩은 gray다', () => {
    renderCard();

    expect(
      screen.getByRole('button', { name: '성수동 러닝 모임' }).getAttribute('aria-pressed'),
    ).toBe('false');
    expect(screen.getByText('지예').className).toContain('bg-surface-secondary');
  });

  it('selected면 aria-pressed가 true이고 칩과 글자가 brand다', () => {
    renderCard({ selected: true });
    const card = screen.getByRole('button', { name: '성수동 러닝 모임' });

    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(card.className).toContain('text-text-brand');
    expect(screen.getByText('지예').className).toContain('bg-surface-brand-subtle-1');
  });

  it('카드를 누르면 onCardClick, 화살표를 누르면 onDetailClick만 호출된다', () => {
    const onCardClick = vi.fn();
    const onDetailClick = vi.fn();
    renderCard({ onCardClick, onDetailClick });

    fireEvent.click(screen.getByRole('button', { name: '성수동 러닝 모임' }));

    expect(onCardClick).toHaveBeenCalledTimes(1);
    expect(onDetailClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '성수동 러닝 모임 상세 보기' }));

    expect(onDetailClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('두 버튼은 form 안에서 제출하지 않고 아이콘은 숨겨진다', () => {
    const { container } = renderCard();

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('type')).toBe('button');
    }
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('className과 div 속성이 카드에 합쳐진다', () => {
    renderCard({ className: 'mt-2', 'data-testid': 'card' } as Partial<SuggestedBundleCardProps>);

    expect(screen.getByTestId('card').className).toContain('mt-2');
  });
});
