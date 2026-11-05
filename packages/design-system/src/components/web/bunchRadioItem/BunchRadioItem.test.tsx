import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BunchRadioItem } from './BunchRadioItem';

afterEach(cleanup);

describe('BunchRadioItem', () => {
  it('번치 이름과 알림 수가 라디오의 접근성 이름이다', () => {
    render(<BunchRadioItem label="퇴근런클럽" name="bunch" value="1" alertCount={5} />);

    expect(screen.getByRole('radio', { name: /^퇴근런클럽\s*,\s*알림\s*5\s*개$/ })).toBeTruthy();
  });

  it('알림이 0이면 칩을 숨긴다', () => {
    render(<BunchRadioItem label="퇴근런클럽" name="bunch" value="1" alertCount={0} />);

    expect(screen.getByRole('radio', { name: '퇴근런클럽' })).toBeTruthy();
    expect(screen.queryByText(/알림/)).toBeNull();
  });

  it('행을 누르면 선택되고, 그룹 안에서 하나만 선택된다', () => {
    render(
      <>
        <BunchRadioItem label="퇴근런클럽" name="bunch" value="1" />
        <BunchRadioItem label="야간러너스" name="bunch" value="2" />
      </>,
    );

    fireEvent.click(screen.getByText('퇴근런클럽'));
    fireEvent.click(screen.getByText('야간러너스'));

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '퇴근런클럽' }).checked).toBe(false);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '야간러너스' }).checked).toBe(true);
  });

  it('비활성이면 눌러도 선택되지 않는다', () => {
    render(<BunchRadioItem label="퇴근런클럽" name="bunch" value="1" disabled />);

    fireEvent.click(screen.getByText('퇴근런클럽'));

    expect(screen.getByRole<HTMLInputElement>('radio', { name: '퇴근런클럽' }).checked).toBe(false);
  });

  it('체크 아이콘은 장식이고 긴 이름은 title로 전체를 보여 준다', () => {
    const { container } = render(
      <BunchRadioItem label="아주아주긴이름을가진번치입니다" name="bunch" value="1" />,
    );

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('아주아주긴이름을가진번치입니다').getAttribute('title')).toBe(
      '아주아주긴이름을가진번치입니다',
    );
  });
});
