import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileListItem } from './ProfileListItem';

afterEach(cleanup);

describe('ProfileListItem', () => {
  it('이름과 덧붙임을 보여 준다', () => {
    render(<ProfileListItem name="은우링링링" suffix="(나)" />);

    expect(screen.getByText('은우링링링')).toBeTruthy();
    expect(screen.getByText('(나)')).toBeTruthy();
  });

  it('더보기 버튼은 이름이 든 접근성 이름을 갖고 onMore를 부른다', () => {
    const onMore = vi.fn();
    render(<ProfileListItem name="은우링링링" onMore={onMore} />);

    fireEvent.click(screen.getByRole('button', { name: '은우링링링 더보기' }));

    expect(onMore).toHaveBeenCalledOnce();
  });

  it('비활성이면 더보기 버튼도 비활성이다', () => {
    const onMore = vi.fn();
    render(<ProfileListItem name="은우링링링" onMore={onMore} disabled />);

    const more = screen.getByRole<HTMLButtonElement>('button', { name: '은우링링링 더보기' });
    fireEvent.click(more);

    expect(more.disabled).toBe(true);
    expect(onMore).not.toHaveBeenCalled();
  });

  it('비활성이면 action 슬롯을 inert로 막는다', () => {
    render(
      <ProfileListItem
        name="야간러너스"
        disabled
        action={<button type="button">차단해제</button>}
      />,
    );

    expect(screen.getByText('차단해제').closest('[inert]')).not.toBeNull();
  });

  it('말줄임될 수 있는 이름은 title로 전체를 보여 준다', () => {
    render(<ProfileListItem name="아주아주긴이름을가진멤버" />);

    expect(screen.getByText('아주아주긴이름을가진멤버').getAttribute('title')).toBe(
      '아주아주긴이름을가진멤버',
    );
  });

  it('action이 있으면 더보기 대신 action을 보여 준다', () => {
    render(
      <ProfileListItem
        name="야간러너스"
        onMore={() => {}}
        action={<button type="button">차단해제</button>}
      />,
    );

    expect(screen.getByRole('button', { name: '차단해제' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '야간러너스 더보기' })).toBeNull();
  });

  it('역할 이름이 있으면 배지를 이미지로 읽는다', () => {
    render(<ProfileListItem name="은우링링링" memberRole="owner" roleLabel="번치장" />);

    expect(screen.getByRole('img', { name: '번치장' })).toBeTruthy();
  });
});
