import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TermsLabel } from './TermsLabel';

describe('TermsLabel', () => {
  it('태그와 약관 이름을 접근성 이름으로 가진 체크박스로 렌더링한다', () => {
    render(<TermsLabel tag="[필수]">서비스 이용 약관</TermsLabel>);

    const checkbox = screen.getByRole('checkbox', { name: '[필수] 서비스 이용 약관' });
    expect(checkbox).toHaveProperty('checked', false);
  });

  it('누르면 선택되고 다시 누르면 해제된다', async () => {
    const onChange = vi.fn();
    render(
      <TermsLabel tag="[필수]" onChange={onChange}>
        서비스 이용 약관
      </TermsLabel>,
    );

    await userEvent.click(screen.getByText('서비스 이용 약관'));
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', true);
    await userEvent.click(screen.getByText('서비스 이용 약관'));
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('onViewTerms가 없으면 약관 보기 버튼이 없다', () => {
    render(<TermsLabel>서비스 이용 약관</TermsLabel>);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('약관 보기 버튼을 누르면 onViewTerms를 호출하고 체크 상태는 바뀌지 않는다', async () => {
    const onViewTerms = vi.fn();
    render(<TermsLabel onViewTerms={onViewTerms}>서비스 이용 약관</TermsLabel>);

    await userEvent.click(screen.getByRole('button', { name: '약관 내용 보기' }));

    expect(onViewTerms).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
  });

  it('약관 보기 버튼 이름을 바꿀 수 있고 키보드로 누를 수 있다', async () => {
    const onViewTerms = vi.fn();
    render(
      <TermsLabel onViewTerms={onViewTerms} viewLabel="서비스 이용 약관 보기">
        서비스 이용 약관
      </TermsLabel>,
    );

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox'));
    await userEvent.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '서비스 이용 약관 보기' }),
    );
    await userEvent.keyboard('{Enter}');

    expect(onViewTerms).toHaveBeenCalledTimes(1);
  });

  it('disabled면 체크할 수 없다', async () => {
    const onChange = vi.fn();
    render(
      <TermsLabel disabled onChange={onChange}>
        서비스 이용 약관
      </TermsLabel>,
    );

    await userEvent.click(screen.getByText('서비스 이용 약관'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('className은 행 전체에, 나머지 props는 체크박스에 적용된다', () => {
    render(
      <TermsLabel className="custom-row" name="terms" id="terms-check">
        서비스 이용 약관
      </TermsLabel>,
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.closest('div')?.className).toContain('custom-row');
    expect(checkbox).toHaveProperty('name', 'terms');
    expect(checkbox).toHaveProperty('id', 'terms-check');
  });
});
