import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LabeledTextField } from './LabeledTextField';

const Controlled = ({ maxLength, error }: { maxLength?: number; error?: string }) => {
  const [value, setValue] = useState('');
  return (
    <LabeledTextField
      label="번치 이름"
      value={value}
      maxLength={maxLength}
      error={error}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

describe('LabeledTextField', () => {
  it('보이는 라벨이 입력창의 이름이다', () => {
    render(<LabeledTextField label="번치 이름" />);

    expect(screen.getByRole('textbox', { name: '번치 이름' })).toBeTruthy();
    expect(screen.getByLabelText('번치 이름')).toBe(screen.getByRole('textbox'));
  });

  it('maxLength와 값이 있으면 글자 수를 보여 주고 입력에 따라 바뀐다', async () => {
    render(<Controlled maxLength={12} />);
    expect(screen.getByText('0/12')).toBeTruthy();

    await userEvent.type(screen.getByRole('textbox'), '퇴근런클럽');

    expect(screen.getByText('5/12')).toBeTruthy();
  });

  it('maxLength를 넘겨서는 입력되지 않는다', async () => {
    render(<Controlled maxLength={3} />);

    await userEvent.type(screen.getByRole('textbox'), '퇴근런클럽');

    expect(screen.getByDisplayValue('퇴근런')).toBe(screen.getByRole('textbox'));
    expect(screen.getByText('3/3')).toBeTruthy();
  });

  it('maxLength가 없으면 글자 수를 보여 주지 않는다', () => {
    render(<LabeledTextField label="번치 이름" value="퇴근런클럽" onChange={() => {}} />);

    expect(screen.queryByText(/\/\d+/)).toBeNull();
  });

  it('error가 있으면 안내를 보여 주고 입력창을 잘못된 값으로 표시해 안내와 연결한다', () => {
    render(<Controlled maxLength={12} error="특수문자를 제외한 영문, 한글만 사용할 수 있어요." />);

    const input = screen.getByRole('textbox', { name: '번치 이름' });
    const text = '특수문자를 제외한 영문, 한글만 사용할 수 있어요.';
    expect(input.getAttribute('aria-invalid')).toBe('true');
    // 입력창 설명에는 보이는 안내가 연결되고, 읽기는 항상 있는 status 영역이 맡는다
    const described = document.getElementById(
      input.getAttribute('aria-describedby')?.split(' ')[0] ?? '',
    );
    expect(described?.textContent).toBe(text);
    expect(screen.getByRole('status').textContent).toBe(text);
  });

  it('error가 없어도 status 영역은 비어 있는 채로 있어 첫 오류가 읽힌다', () => {
    const { rerender } = render(<LabeledTextField label="번치 이름" error={undefined} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');

    rerender(<LabeledTextField label="번치 이름" error="오류" />);

    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toBe('오류');
  });

  it('error가 없으면 잘못된 값 표시가 없다', () => {
    render(<Controlled maxLength={12} />);

    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBeNull();
  });

  it('글자 수도 입력창 설명에 연결된다', () => {
    render(<Controlled maxLength={12} />);

    const input = screen.getByRole('textbox');
    const count = screen.getByText('0/12');
    expect(input.getAttribute('aria-describedby')).toBe(count.id);
  });

  it('카드가 여럿이어도 라벨 연결이 섞이지 않는다', () => {
    render(
      <>
        <LabeledTextField label="번치 이름" />
        <LabeledTextField label="소개" />
      </>,
    );

    expect(screen.getByLabelText('번치 이름')).not.toBe(screen.getByLabelText('소개'));
  });

  it('id와 className을 전달한다', () => {
    const { container } = render(
      <LabeledTextField label="번치 이름" id="name" className="custom" />,
    );

    expect(screen.getByRole('textbox').id).toBe('name');
    expect(container.firstElementChild?.className).toContain('custom');
  });
});
