import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColorBadge } from '../../core/colorBadge';
import { AdminHeader } from './AdminHeader';

afterEach(cleanup);

describe('AdminHeader', () => {
  it('제목을 heading으로, 코드와 배지를 함께 보여 준다', () => {
    render(
      <AdminHeader
        title="플로디스튜디오"
        code="#S-0012"
        badge={
          <ColorBadge variant="weak" color="brand">
            노출중
          </ColorBadge>
        }
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: '플로디스튜디오' })).toBeTruthy();
    expect(screen.getByText('#S-0012')).toBeTruthy();
    expect(screen.getByText('노출중')).toBeTruthy();
  });

  it('뒤로 가기·닫기는 이름 있는 버튼이고 누르면 콜백을 부른다', () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    render(
      <AdminHeader
        title="신고 내역"
        back={{ onClick: onBack, label: '목록으로' }}
        close={{ onClick: onClose, label: '닫기' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('버튼을 주지 않으면 그리지 않고, heading 단계를 바꿀 수 있다', () => {
    render(<AdminHeader title="회원 상세" titleAs="h1" />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: '회원 상세' })).toBeTruthy();
  });
});
