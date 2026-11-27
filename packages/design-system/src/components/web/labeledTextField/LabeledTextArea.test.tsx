import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LabeledTextArea } from './LabeledTextArea';

const Controlled = ({ maxLength, error }: { maxLength?: number; error?: string }) => {
  const [value, setValue] = useState('');
  return (
    <LabeledTextArea
      label="한 줄 소개"
      placeholder="우리 번치를 간단하게 소개해주세요"
      value={value}
      maxLength={maxLength}
      error={error}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

describe('LabeledTextArea', () => {
  it('필수면 라벨 옆에 별표를 보이고 입력창을 필수로 알린다(별표는 낭독에서 뺌)', () => {
    render(<LabeledTextArea label="한 줄 소개" option="required" value="" onChange={() => {}} />);

    const input = screen.getByRole('textbox', { name: '한 줄 소개' });
    expect(input.getAttribute('aria-required')).toBe('true');
    const star = screen.getByText('*');
    expect(star.getAttribute('aria-hidden')).toBe('true');
    expect(star.classList.contains('text-icon-secondary')).toBe(true);
  });

  it('선택이면 「선택」 표시를 보이고 필수로 알리지 않는다', () => {
    render(<LabeledTextArea label="한 줄 소개" option="optional" value="" onChange={() => {}} />);

    expect(screen.getByText('선택')).toBeTruthy();
    expect(screen.getByRole('textbox').hasAttribute('aria-required')).toBe(false);
  });

  it('보이는 라벨이 입력창의 이름이고 안내 문구를 보여 준다', () => {
    render(<Controlled />);

    const input = screen.getByRole('textbox', { name: '한 줄 소개' });
    expect(screen.getByLabelText('한 줄 소개')).toBe(input);
    expect(input.getAttribute('placeholder')).toBe('우리 번치를 간단하게 소개해주세요');
  });

  it('글자 수를 보여 주고 입력에 따라 바뀐다', async () => {
    render(<Controlled maxLength={50} />);
    expect(screen.getByText('0/50')).toBeTruthy();

    await userEvent.type(screen.getByRole('textbox'), '맛집 탐방');

    expect(screen.getByText('5/50')).toBeTruthy();
  });

  it('maxLength를 넘겨서는 입력되지 않는다', async () => {
    render(<Controlled maxLength={4} />);

    await userEvent.type(screen.getByRole('textbox'), '맛집탐방에진심');

    expect(screen.getByDisplayValue('맛집탐방')).toBe(screen.getByRole('textbox'));
  });

  it('이모지·결합 문자도 보이는 글자 하나로 세고, 최대 길이도 그 기준으로 자른다', async () => {
    render(<Controlled maxLength={3} />);

    await userEvent.type(screen.getByRole('textbox'), '😀👍🏻가나');

    expect(screen.getByDisplayValue('😀👍🏻가')).toBe(screen.getByRole('textbox'));
    expect(screen.getByText('3/3')).toBeTruthy();
  });

  it('최대 길이에서 글 가운데에 입력해도 원래 글의 끝은 지워지지 않는다', async () => {
    const user = userEvent.setup();
    render(<Controlled maxLength={4} />);
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox');
    await user.type(textarea, '가나다라');

    await user.type(textarea, '마', { initialSelectionStart: 2, initialSelectionEnd: 2 });

    expect(textarea.value).toBe('가나다라');
  });

  it('커서 앞에 붙인 글이 뒤 글자와 이어져 한 글자가 되면 자르지 않는다(ZWJ 이모지)', () => {
    render(<Controlled maxLength={1} />);
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox');
    fireEvent.change(textarea, { target: { value: '💻' } });

    // 맨 앞에 「👩 + ZWJ」를 붙여 「👩‍💻」 한 글자가 됨(커서는 붙인 글 뒤)
    const joined = '👩\u200D💻';
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
      textarea,
      joined,
    );
    textarea.setSelectionRange(3, 3);
    fireEvent.input(textarea);

    expect(textarea.value).toBe(joined);
    expect(screen.getByText('1/1')).toBeTruthy();
  });

  it('최대 길이에서 커서가 이어진 글자 가운데면 그 글자는 지키고 커서를 글자 끝으로 옮긴다', () => {
    render(<Controlled maxLength={3} />);
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox');
    fireEvent.change(textarea, { target: { value: 'ABC💻' } });

    // 「💻」 앞에 「👩 + ZWJ」를 넣어 「👩‍💻」가 되고 커서는 ZWJ 바로 뒤(글자 가운데)
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
      textarea,
      'ABC👩\u200D💻',
    );
    textarea.setSelectionRange(6, 6);
    fireEvent.input(textarea);

    expect(textarea.value).toBe('AB👩\u200D💻');
    expect(textarea.selectionStart).toBe(7);
  });

  it('한글 조합 중에는 자르지 않고 조합이 끝나면 자른다', () => {
    render(<Controlled maxLength={2} />);
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox');

    fireEvent.compositionStart(textarea);
    // React 값 추적을 거치지 않는 기본 setter로 조합 중인 값을 넣음
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
      textarea,
      '가나ㄷ',
    );
    fireEvent.input(textarea, { isComposing: true });
    expect(textarea.value).toBe('가나ㄷ');

    fireEvent.compositionEnd(textarea);
    expect(textarea.value).toBe('가나');
    expect(screen.getByText('2/2')).toBeTruthy();
  });

  it('줄바꿈은 그대로 넣고 한 글자로 센다', async () => {
    render(<Controlled maxLength={50} />);

    await userEvent.type(screen.getByRole('textbox'), '가{Enter}나');

    expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe('가\n나');
    expect(screen.getByText('3/50')).toBeTruthy();
  });

  it('값이 바뀌면 내용 높이에 맞춰 늘어난다', async () => {
    render(<Controlled />);
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 66 });

    await userEvent.type(textarea, '가');

    expect(textarea.style.height).toBe('66px');
    expect(textarea.parentElement?.style.getPropertyValue('--textarea-height')).toBe('66px');
  });

  it('error가 있으면 안내를 입력창에 연결하고 항상 있는 status 영역이 읽는다', () => {
    render(<Controlled maxLength={50} error="오류 문구" />);

    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const described = document.getElementById(
      input.getAttribute('aria-describedby')?.split(' ')[0] ?? '',
    );
    expect(described?.textContent).toBe('오류 문구');
    expect(screen.getByRole('status').textContent).toBe('오류 문구');
  });

  it('error가 없으면 잘못된 값 표시가 없고 status 영역은 비어 있다', () => {
    render(<Controlled maxLength={50} />);

    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('id와 className을 전달한다', () => {
    const { container } = render(
      <LabeledTextArea label="한 줄 소개" id="intro" className="custom" />,
    );

    expect(screen.getByRole('textbox').id).toBe('intro');
    expect(container.firstElementChild?.className).toContain('custom');
  });
});
