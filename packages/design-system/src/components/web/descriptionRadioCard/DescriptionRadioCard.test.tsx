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
});
