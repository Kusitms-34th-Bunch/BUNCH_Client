import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileRadioCard } from './ProfileRadioCard';

afterEach(cleanup);

describe('ProfileRadioCard', () => {
  it('멤버 이름이 라디오의 접근성 이름이다', () => {
    render(<ProfileRadioCard label="경진" name="member" value="1" />);

    expect(screen.getByRole('radio', { name: '경진' })).toBeTruthy();
  });

  it('카드를 누르면 선택되고, 그룹 안에서 하나만 선택된다', () => {
    render(
      <>
        <ProfileRadioCard label="경진" name="member" value="1" />
        <ProfileRadioCard label="은우" name="member" value="2" />
      </>,
    );

    fireEvent.click(screen.getByText('경진'));
    fireEvent.click(screen.getByText('은우'));

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '경진' }).checked).toBe(false);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '은우' }).checked).toBe(true);
  });

  it('비활성이면 눌러도 선택되지 않는다', () => {
    render(<ProfileRadioCard label="경진" name="member" value="1" disabled />);

    fireEvent.click(screen.getByText('경진'));

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '경진' }).checked).toBe(false);
  });

  it('말줄임될 수 있는 이름은 title로 전체를 보여 준다', () => {
    render(<ProfileRadioCard label="아주아주긴이름을가진멤버" name="member" value="1" />);

    expect(screen.getByText('아주아주긴이름을가진멤버').getAttribute('title')).toBe(
      '아주아주긴이름을가진멤버',
    );
  });
});
