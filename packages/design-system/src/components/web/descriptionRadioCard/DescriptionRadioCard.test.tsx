import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DescriptionRadioCard } from './DescriptionRadioCard';

afterEach(cleanup);

describe('DescriptionRadioCard', () => {
  it('제목이 이름, 설명이 접근성 설명이다', () => {
    render(
      <DescriptionRadioCard
        title="공개"
        description="누구나 우리 번치와 번들을 볼 수 있어요."
        name="visibility"
        value="public"
      />,
    );

    const radio = screen.getByRole('radio', { name: '공개' });
    const describedBy = radio.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe(
      '누구나 우리 번치와 번들을 볼 수 있어요.',
    );
  });

  it('카드를 누르면 선택된다', () => {
    render(<DescriptionRadioCard title="공개" name="visibility" value="public" />);

    fireEvent.click(screen.getByText('공개'));

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '공개' }).checked).toBe(true);
  });

  it('기본은 surface-secondary 바탕에 border-secondary 테두리, 선택하면 테두리만 border-strong-lighter', () => {
    const { container } = render(<DescriptionRadioCard title="공개" name="visibility" />);
    const card = container.firstElementChild;

    expect(card?.classList.contains('bg-surface-secondary')).toBe(true);
    expect(card?.classList.contains('ring-border-secondary')).toBe(true);
    expect(card?.classList.contains('has-checked:ring-border-strong-lighter')).toBe(true);
    expect(card?.className).not.toContain('has-checked:bg-');
  });

  it('비활성이면 눌러도 선택되지 않는다', () => {
    render(<DescriptionRadioCard title="공개" name="visibility" value="public" disabled />);

    fireEvent.click(screen.getByText('공개'));

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '공개' }).checked).toBe(false);
  });

  it('설명이 없으면 aria-describedby를 두지 않는다', () => {
    render(<DescriptionRadioCard title="공개" name="visibility" value="public" />);

    expect(screen.getByRole('radio', { name: '공개' }).hasAttribute('aria-describedby')).toBe(
      false,
    );
  });

  it('카드는 반경 r5, 사방 12 여백, 라디오와 글자 사이 10px이다', () => {
    const { container } = render(
      <DescriptionRadioCard name="g" value="a" title="비공개" description="설명" />,
    );
    const card = container.firstElementChild as HTMLElement;

    expect(card.classList.contains('rounded-r5')).toBe(true);
    expect(card.classList.contains('p-padding-p6')).toBe(true);
    expect(card.classList.contains('gap-s5')).toBe(true);
  });

  it('제목은 Body-3-Semibold text-primary, 설명은 Caption-1-Regular이다', () => {
    render(<DescriptionRadioCard name="g" value="a" title="비공개" description="설명" />);

    expect(screen.getByText('비공개').classList.contains('typography-body-3-semibold')).toBe(true);
    expect(screen.getByText('비공개').classList.contains('text-text-primary')).toBe(true);
    expect(screen.getByText('설명').classList.contains('typography-caption-1-regular')).toBe(true);
  });
});
