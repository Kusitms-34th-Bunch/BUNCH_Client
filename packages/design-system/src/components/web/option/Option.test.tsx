import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Option } from './Option';

describe('Option', () => {
  it('기본값은 "필수"를 보여 준다', () => {
    render(<Option />);

    expect(screen.getByText('필수')).toBeTruthy();
  });

  it('optional이면 "선택"을 보여 준다', () => {
    render(<Option variant="optional" />);

    expect(screen.getByText('선택')).toBeTruthy();
    expect(screen.queryByText('필수')).toBeNull();
  });

  it('글자를 넘기면 기본 글자 대신 그 글자를 보여 준다', () => {
    render(<Option variant="required">Required</Option>);

    expect(screen.getByText('Required')).toBeTruthy();
    expect(screen.queryByText('필수')).toBeNull();
  });

  it('필수와 선택은 색 클래스가 다르다', () => {
    const { rerender } = render(<Option />);
    const required = screen.getByText('필수').className;

    rerender(<Option variant="optional" />);
    const optional = screen.getByText('선택').className;

    expect(required).toContain('text-text-brand');
    expect(optional).toContain('text-text-quaternary');
  });

  it('className과 native 속성을 받는다', () => {
    render(<Option className="custom" data-testid="option" />);

    expect(screen.getByTestId('option').className).toContain('custom');
  });
});
