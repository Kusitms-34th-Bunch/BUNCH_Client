import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RadioButton } from './RadioButton';

afterEach(cleanup);

const Group = () => (
  <fieldset>
    <legend>신고 사유</legend>
    <RadioButton name="reason" value="spam">
      스팸
    </RadioButton>
    <RadioButton name="reason" value="etc">
      기타
    </RadioButton>
  </fieldset>
);

describe('RadioButton', () => {
  it('글자가 라디오 이름이고 같은 name끼리 하나만 선택된다', () => {
    render(<Group />);
    const spam = screen.getByRole<HTMLInputElement>('radio', { name: '스팸' });
    const etc = screen.getByRole<HTMLInputElement>('radio', { name: '기타' });

    fireEvent.click(spam);
    fireEvent.click(etc);

    expect(spam.checked).toBe(false);
    expect(etc.checked).toBe(true);
  });

  it('글자를 눌러도 선택된다', () => {
    render(<Group />);

    fireEvent.click(screen.getByText('기타'));

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '기타' }).checked).toBe(true);
  });
});
