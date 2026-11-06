import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOwnedBunches, resetOwnedBunches } from '../../hooks/useOwnedBunches';
import { AdminTransferScreen } from './AdminTransferScreen';

const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back, replace }) }));

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  resetOwnedBunches();
});

const openBunch = (name: string) => userEvent.click(screen.getByRole('button', { name }));
const pick = (bunch: string, member: string) =>
  userEvent.click(
    within(screen.getByRole('group', { name: `${bunch} 멤버` })).getByRole('radio', {
      name: member,
    }),
  );

describe('AdminTransferScreen', () => {
  it('메인 관리자인 번치를 접힌 상태로 보여 주고 「다음」은 막혀 있다', () => {
    render(<AdminTransferScreen />);

    expect(screen.getByRole('heading', { level: 1, name: '관리자 권한 넘기기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '퇴근런클럽' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: '야르렁모임' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });

  it('번치를 펼치면 멤버를 고를 수 있고, 공동 관리자는 역할도 읽힌다', async () => {
    render(<AdminTransferScreen />);

    await openBunch('퇴근런클럽');
    const group = screen.getByRole('group', { name: '퇴근런클럽 멤버' });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['m-1', 'm-2', 'm-3', 'm-4']);
    expect(within(group).getByRole('radio', { name: /^지예\s?, 공동 관리자$/ })).toBeTruthy();
  });

  it('같은 번치에서 다른 멤버를 고르면 바뀌고, 다른 번치 선택에는 영향이 없다', async () => {
    render(<AdminTransferScreen />);
    await openBunch('퇴근런클럽');
    await openBunch('야르렁모임');

    await pick('퇴근런클럽', '서현');
    await pick('야르렁모임', '경준');
    await pick('퇴근런클럽', '재현');

    expect(screen.getByRole('radio', { name: '서현' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '재현' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '경준' })).toBeChecked();
  });

  it('모든 번치를 골라야 「다음」이 풀리고, 누르면 권한을 넘기고 탈퇴 안내로 돌아간다', async () => {
    render(<AdminTransferScreen />);
    await openBunch('퇴근런클럽');
    await openBunch('야르렁모임');
    const next = screen.getByRole('button', { name: '다음' });

    expect(next).toHaveAccessibleDescription(
      '모든 번치에서 새 관리자를 골라 주세요. 2개 중 0개 골랐어요.',
    );
    await pick('퇴근런클럽', '서현');
    expect(next).toBeDisabled();
    expect(next).toHaveAccessibleDescription(
      '모든 번치에서 새 관리자를 골라 주세요. 2개 중 1개 골랐어요.',
    );
    await pick('야르렁모임', '경준');
    expect(next).toBeEnabled();
    expect(next).toHaveAccessibleDescription('모든 번치의 새 관리자를 골랐어요.');
    await userEvent.click(next);

    expect(getOwnedBunches()).toEqual([]);
    // 돌아가는 동안 다시 누를 수 없음
    expect(next).toBeDisabled();
    // 기록이 없으면 탈퇴 안내로 replace
    expect(replace).toHaveBeenCalledWith('/my/withdrawal');
    // 돌아가는 동안 목록은 그대로
    expect(screen.getByRole('button', { name: '퇴근런클럽' })).toBeTruthy();
  });

  it('뒤로 가기는 기록이 없으면 탈퇴 안내로 간다', async () => {
    render(<AdminTransferScreen />);

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(replace).toHaveBeenCalledWith('/my/withdrawal');
    expect(getOwnedBunches()).toHaveLength(2);
  });
});
