import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LabeledTextField } from './LabeledTextField';

const Controlled = ({ initial = '' }: { initial?: string }) => {
  const [value, setValue] = useState(initial);
  return (
    <LabeledTextField
      title="닉네임"
      option="required"
      maxLength={12}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

describe('LabeledTextField', () => {
  it('제목을 입력창의 접근성 이름으로 가진다', () => {
    render(<LabeledTextField title="닉네임" />);

    expect(screen.getByRole('textbox', { name: '닉네임' })).toBeTruthy();
  });

  it('제목을 누르면 입력창에 포커스가 간다', async () => {
    render(<LabeledTextField title="닉네임" />);

    await userEvent.click(screen.getByText('닉네임'));

    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('필수·선택 표시를 제목 옆에 보여 주고 필수면 aria-required를 건다', () => {
    const { rerender } = render(<LabeledTextField title="닉네임" option="required" />);
    expect(screen.getByText('필수')).toBeTruthy();
    expect(screen.getByRole('textbox').getAttribute('aria-required')).toBe('true');

    rerender(<LabeledTextField title="닉네임" option="optional" />);
    expect(screen.getByText('선택')).toBeTruthy();
    expect(screen.getByRole('textbox').getAttribute('aria-required')).toBeNull();
  });

  it('option이 없으면 필수·선택 표시를 그리지 않는다', () => {
    render(<LabeledTextField title="닉네임" />);

    expect(screen.queryByText('필수')).toBeNull();
    expect(screen.queryByText('선택')).toBeNull();
  });

  it('maxLength가 있으면 글자 수를 보여 주고 입력에 따라 바뀐다', async () => {
    render(<LabeledTextField title="닉네임" maxLength={12} />);
    expect(screen.getByText('0/12')).toBeTruthy();

    await userEvent.type(screen.getByRole('textbox'), '으누누');

    expect(screen.getByText('3/12')).toBeTruthy();
  });

  it('controlled value의 길이로 글자 수를 보여 준다', () => {
    render(<LabeledTextField title="닉네임" maxLength={12} value="으누누" onChange={vi.fn()} />);

    expect(screen.getByText('3/12')).toBeTruthy();
  });

  it('maxLength가 없으면 글자 수를 그리지 않는다', () => {
    render(<LabeledTextField title="닉네임" />);

    expect(screen.queryByText(/\/\d+/)).toBeNull();
  });

  it('errorMessage가 있으면 알림으로 보여 주고 입력창에 invalid와 설명을 연결한다', () => {
    render(<LabeledTextField title="닉네임" errorMessage="이미 사용 중인 닉네임이에요." />);

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('이미 사용 중인 닉네임이에요.');
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('errorMessage가 없으면 알림과 invalid가 없다', () => {
    render(<LabeledTextField title="닉네임" />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBeNull();
  });

  it('입력창은 기본 변형이라 값이 있고 포커스가 있어도 지우기 버튼이 없다', async () => {
    render(<Controlled initial="으누누" />);

    await userEvent.tab();

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('입력하면 값과 글자 수가 갱신된다', async () => {
    render(<Controlled initial="으누누" />);

    await userEvent.type(screen.getByRole('textbox'), '!');

    expect(screen.getByRole('textbox')).toHaveProperty('value', '으누누!');
    expect(screen.getByText('4/12')).toBeTruthy();
  });

  it('disabled면 입력창을 쓸 수 없다', () => {
    render(<LabeledTextField title="닉네임" disabled />);

    expect(screen.getByRole('textbox')).toHaveProperty('disabled', true);
  });

  it('disabled면 제목·입력창·글자 수·오류 문구 각각에만 40% 투명 클래스가 붙는다(루트에는 없다)', () => {
    const dim = 'opacity-(--semantic-opacity-disabled)';
    render(<LabeledTextField title="닉네임" maxLength={12} errorMessage="오류" disabled />);

    const root = screen.getByRole('textbox').closest('.gap-s3.flex.w-full.flex-col')!;
    expect(root.className).not.toContain(dim);
    expect(screen.getByText('닉네임').className).toContain(dim);
    expect(screen.getByRole('alert').parentElement!.className).toContain(dim);
    const field = screen.getByRole('textbox').parentElement!.parentElement!;
    expect(field.className).toContain('has-[input:disabled]:' + dim);
  });

  it('disabled가 아니면 어디에도 40% 투명 클래스가 붙지 않는다', () => {
    render(<LabeledTextField title="닉네임" maxLength={12} errorMessage="오류" />);

    const dimmed = [...document.body.querySelectorAll('*')].filter((element) =>
      element.classList.contains('opacity-(--semantic-opacity-disabled)'),
    );
    expect(dimmed).toHaveLength(0);
  });

  it('editing을 입력창에 전달해 입력창이 진행 중으로 표시된다', () => {
    render(<LabeledTextField title="닉네임" editing />);

    expect(screen.getByRole('textbox').getAttribute('aria-busy')).toBe('true');
  });

  it('className은 전체 영역에 적용된다', () => {
    render(<LabeledTextField title="닉네임" className="custom-row" />);

    expect(screen.getByRole('textbox').closest('.custom-row')).toBeTruthy();
  });

  it('호출자가 준 aria-describedby를 오류 문구·글자 수와 함께 유지한다', () => {
    render(
      <LabeledTextField
        title="닉네임"
        maxLength={12}
        errorMessage="오류"
        aria-describedby="nickname-help"
      />,
    );

    const describedBy = screen.getByRole('textbox').getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('nickname-help');
    expect(describedBy).toContain(screen.getByRole('alert').id);
    expect(describedBy.split(' ')).toHaveLength(3);
  });

  it('오류가 없으면 호출자가 준 aria-invalid를 그대로 쓴다', () => {
    render(<LabeledTextField title="닉네임" aria-invalid="true" />);

    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
  });
});
