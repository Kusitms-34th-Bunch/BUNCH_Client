import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BunchMember } from '../../lib/types';
import { BunchLeaveScreen } from './BunchLeaveScreen';
import { BunchMenuScreen } from './BunchMenuScreen';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const CANDIDATES: BunchMember[] = [
  { id: 'a', name: '경준', role: 'member' },
  { id: 'b', name: '경진', role: 'coOwner' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BunchMenuScreen 나가기', () => {
  it('메인 관리자는 확인 창 없이 새 관리자 지정 화면으로 간다', async () => {
    const onOwnerLeave = vi.fn();
    render(
      <BunchMenuScreen
        bunchName="퇴근런클럽"
        myRole="owner"
        onBack={vi.fn()}
        onLeave={vi.fn()}
        onOwnerLeave={onOwnerLeave}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '번치 나가기' }));

    expect(onOwnerLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('나만 남은 번치는 나가지 못하고 삭제 안내를 띄우며 「삭제하기」는 onDeleteBunch를 부른다', async () => {
    const user = userEvent.setup();
    const onDeleteBunch = vi.fn();
    const onOwnerLeave = vi.fn();
    render(
      <BunchMenuScreen
        bunchName="퇴근런클럽"
        myRole="owner"
        alone
        onBack={vi.fn()}
        onLeave={vi.fn()}
        onOwnerLeave={onOwnerLeave}
        onDeleteBunch={onDeleteBunch}
      />,
    );

    await user.click(screen.getByRole('button', { name: '번치 나가기' }));
    const dialog = await screen.findByRole('alertdialog', {
      name: '혼자 있는 번치는 나갈 수 없어요',
    });
    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    expect(onDeleteBunch).toHaveBeenCalledTimes(1);
    expect(onOwnerLeave).not.toHaveBeenCalled();
  });
});

describe('BunchLeaveScreen', () => {
  it('새 관리자를 고르기 전에는 「관리자로 지정하기」가 비활성이다', () => {
    render(
      <BunchLeaveScreen candidates={CANDIDATES} onBack={vi.fn()} onTransferAndLeave={vi.fn()} />,
    );

    expect(
      screen.getByRole('heading', { name: '관리자 권한을 넘길 멤버를 정해주세요.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '관리자로 지정하기' })).toBeDisabled();
  });

  it('멤버를 고르고 확인 시트에서 「지정하고 나가기」를 누르면 그 멤버로 나간다', async () => {
    const user = userEvent.setup();
    const onTransferAndLeave = vi.fn();
    render(
      <BunchLeaveScreen
        candidates={CANDIDATES}
        onBack={vi.fn()}
        onTransferAndLeave={onTransferAndLeave}
      />,
    );

    // 공동 관리자라 역할 이름이 라디오 이름 뒤에 붙음
    await user.click(screen.getByRole('radio', { name: /^경진\s?, 공동 관리자$/ }));
    await user.click(screen.getByRole('button', { name: '관리자로 지정하기' }));
    const sheet = await screen.findByRole('dialog', {
      name: '경진님을 관리자로 지정하고 나갈까요?',
    });
    await user.click(within(sheet).getByRole('button', { name: '지정하고 나가기' }));

    expect(onTransferAndLeave).toHaveBeenCalledWith(CANDIDATES[1]);
  });
});
