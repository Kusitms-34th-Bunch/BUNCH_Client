import { render, screen } from '@testing-library/react';
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

  it('값이 바뀌면 내용 높이에 맞춰 늘어난다', async () => {
    render(<Controlled />);
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 66 });

    await userEvent.type(textarea, '가');

    expect(textarea.style.height).toBe('66px');
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
