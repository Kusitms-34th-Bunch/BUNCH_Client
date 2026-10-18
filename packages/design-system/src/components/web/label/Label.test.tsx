import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { Label } from './Label';

const Controlled = ({ onChange }: { onChange?: Mock }) => {
  const [checked, setChecked] = useState(false);
  return (
    <Label
      checked={checked}
      onChange={(event) => {
        setChecked(event.target.checked);
        onChange?.(event.target.checked);
      }}
    >
      필수 항목 모두 체크하기
    </Label>
  );
};

describe('Label', () => {
  it('글자를 이름으로 가진 체크박스로 렌더링하고 처음에는 선택되지 않는다', () => {
    render(<Label>필수 항목 모두 체크하기</Label>);

    const checkbox = screen.getByRole('checkbox', { name: '필수 항목 모두 체크하기' });
    expect(checkbox).toHaveProperty('checked', false);
  });

  it('누르면 선택되고 다시 누르면 해제된다', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await userEvent.click(screen.getByText('필수 항목 모두 체크하기'));
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', true);

    await userEvent.click(screen.getByText('필수 항목 모두 체크하기'));
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
    expect(onChange.mock.calls).toEqual([[true], [false]]);
  });

  it('키보드로 포커스해 Space로 선택할 수 있다', async () => {
    render(<Label>필수 항목 모두 체크하기</Label>);

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox'));
    await userEvent.keyboard(' ');

    expect(screen.getByRole('checkbox')).toHaveProperty('checked', true);
  });

  it('disabled면 누를 수 없다', async () => {
    const onChange = vi.fn();
    render(
      <Label disabled onChange={onChange}>
        필수 항목 모두 체크하기
      </Label>,
    );

    await userEvent.click(screen.getByText('필수 항목 모두 체크하기'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('아이콘은 화면 읽기에서 숨겨진다', () => {
    const { container } = render(<Label>필수 항목 모두 체크하기</Label>);

    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => expect(icon.getAttribute('aria-hidden')).toBe('true'));
  });

  it('className은 행 전체에, 나머지 props는 체크박스에 적용된다', () => {
    render(
      <Label className="custom-row" name="all" id="all-check">
        필수 항목 모두 체크하기
      </Label>,
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.closest('label')?.className).toContain('custom-row');
    expect(checkbox).toHaveProperty('name', 'all');
    expect(checkbox).toHaveProperty('id', 'all-check');
  });

  it('disabled면 눌러도 선택 상태가 바뀌지 않는다', async () => {
    render(<Label disabled>필수 항목 모두 체크하기</Label>);

    await userEvent.click(screen.getByText('필수 항목 모두 체크하기'));

    expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
  });
});
