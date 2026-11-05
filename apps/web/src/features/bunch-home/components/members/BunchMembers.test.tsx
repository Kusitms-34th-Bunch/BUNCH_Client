import type * as DesignSystem from '@app/design-system';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BunchMember, BunchRole } from '../../lib/types';
import { bunchMembersFixture } from '../../fixtures/bunchMembers.fixture';
import { type BunchMemberActions, sortMembers, useBunchMembers } from '../../hooks/useBunchMembers';
import { BunchMembersScreen } from './BunchMembersScreen';
import { BunchRoleGuide } from './BunchRoleGuide';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), back: vi.fn() }) }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const onInvite = vi.fn();
const actions: BunchMemberActions = { setRole: vi.fn(), transferOwner: vi.fn(), remove: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
});

const withMe = (role: BunchRole): BunchMember[] =>
  sortMembers(
    bunchMembersFixture['bunch-run']!.map((member) => (member.isMe ? { ...member, role } : member)),
  );

const renderScreen = (myRole: BunchRole, members = withMe(myRole)) =>
  render(
    <BunchMembersScreen
      bunchName="퇴근런클럽"
      members={members}
      myRole={myRole}
      actions={actions}
      onBack={vi.fn()}
      onInvite={onInvite}
    />,
  );

const rowNames = () => screen.getAllByRole('listitem').map((item) => item.textContent);

describe('BunchMembersScreen', () => {
  it('역할순·이름순으로 보여 주고 인원은 현재/8명이다', () => {
    renderScreen('owner');

    expect(rowNames()).toEqual(['은우링링링(나)', '경진', '경준', '수인', '지예']);
    expect(screen.getByText('5/8명')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '역할별 권한보기' })).toHaveAttribute(
      'href',
      '/bunch/members/roles',
    );
    expect(screen.getByRole('img', { name: '메인 관리자' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '공동 관리자' })).toBeInTheDocument();
  });

  it('헤더 「멤버 초대」를 누르면 초대 화면으로 간다', async () => {
    renderScreen('member');

    await userEvent.click(screen.getByRole('button', { name: '멤버 초대' }));

    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('메인 관리자는 나를 뺀 모두를, 공동 관리자는 메인 관리자를 뺀 남을, 일반 멤버는 아무도 관리하지 못한다', () => {
    const { unmount } = renderScreen('owner');
    expect(screen.queryByRole('button', { name: '은우링링링 관리' })).toBeNull();
    expect(screen.getAllByRole('button', { name: / 관리$/ })).toHaveLength(4);
    unmount();

    const coOwnerView: BunchMember[] = sortMembers([
      { id: 'owner', name: '하늘', role: 'owner' },
      { id: 'me', name: '은우링링링', role: 'coOwner', isMe: true },
      { id: 'co', name: '도윤', role: 'coOwner' },
      { id: 'm', name: '경준', role: 'member' },
    ]);
    const second = renderScreen('coOwner', coOwnerView);
    expect(
      screen
        .getAllByRole('button', { name: / 관리$/ })
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['도윤 관리', '경준 관리']);
    second.unmount();

    renderScreen('member');
    expect(screen.queryAllByRole('button', { name: / 관리$/ })).toHaveLength(0);
  });

  it('메인 관리자가 일반 멤버를 공동 관리자로 지정하면 확인 뒤 역할을 바꾸고 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    renderScreen('owner');

    await user.click(screen.getByRole('button', { name: '지예 관리' }));
    const menu = await screen.findByRole('alertdialog', { name: '지예' });
    expect(within(menu).getByText('일반 멤버')).toBeInTheDocument();
    expect(
      within(menu)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['공동 관리자로 지정하기', '관리자 권한 넘기기', '번치에서 내보내기', '취소']);
    await user.click(within(menu).getByRole('button', { name: '공동 관리자로 지정하기' }));

    const confirm = await screen.findByRole('alertdialog', {
      name: '지예님을 공동 관리자로 지정할까요?',
    });
    await user.click(within(confirm).getByRole('button', { name: '완료' }));

    expect(actions.setRole).toHaveBeenCalledWith('member-jiye', 'coOwner');
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('지예님이 공동 관리자가 되었어요.', {
      icon: 'success',
      fullWidth: true,
    });
  });

  it('공동 관리자에게는 해제하기가 보이고, 확인 창에서 취소하면 아무것도 바꾸지 않는다', async () => {
    const user = userEvent.setup();
    renderScreen('owner');

    await user.click(screen.getByRole('button', { name: '경진 관리' }));
    const menu = await screen.findByRole('alertdialog', { name: '경진' });
    await user.click(within(menu).getByRole('button', { name: '공동 관리자 해제하기' }));
    const confirm = await screen.findByRole('alertdialog', {
      name: '경진님의 공동 관리자 권한을 해제할까요?',
    });
    await user.click(within(confirm).getByRole('button', { name: '취소' }));

    expect(actions.setRole).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('공동 관리자는 내보내기만 할 수 있고, 내보내면 번치 이름이 든 확인 뒤 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    renderScreen('coOwner');

    await user.click(screen.getByRole('button', { name: '수인 관리' }));
    const menu = await screen.findByRole('alertdialog', { name: '수인' });
    expect(
      within(menu)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['번치에서 내보내기', '취소']);
    await user.click(within(menu).getByRole('button', { name: '번치에서 내보내기' }));
    const confirm = await screen.findByRole('alertdialog', {
      name: '수인님을 퇴근런클럽에서 내보낼까요?',
    });
    await user.click(within(confirm).getByRole('button', { name: '내보내기' }));

    expect(actions.remove).toHaveBeenCalledWith('member-suin');
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('수인님을 번치에서 내보냈어요.', expect.anything());
  });
});

describe('BunchMembersScreen + useBunchMembers', () => {
  function Live() {
    const { members, myRole, actions: live } = useBunchMembers('bunch-trip');
    return (
      <BunchMembersScreen
        bunchName="여행가조"
        members={members}
        myRole={myRole}
        actions={live}
        onBack={vi.fn()}
        onInvite={vi.fn()}
      />
    );
  }

  it('내보내 행이 사라지면 초점을 「멤버 N/8명」 줄로 옮기고 인원을 줄인다', async () => {
    const user = userEvent.setup();
    render(<Live />);

    await user.click(screen.getByRole('button', { name: '수인 관리' }));
    const menu = await screen.findByRole('alertdialog', { name: '수인' });
    await user.click(within(menu).getByRole('button', { name: '번치에서 내보내기' }));
    const confirm = await screen.findByRole('alertdialog', {
      name: '수인님을 여행가조에서 내보낼까요?',
    });
    await user.click(within(confirm).getByRole('button', { name: '내보내기' }));

    await waitFor(() => expect(document.activeElement).toHaveTextContent('3/8명'));
    expect(screen.queryByRole('button', { name: '수인 관리' })).toBeNull();
  });
});

describe('useBunchMembers', () => {
  it('지정·넘기기·내보내기 결과를 정렬해 돌려주고, 넘기면 나는 일반 멤버가 된다', () => {
    const { result } = renderHook(() => useBunchMembers('bunch-run'));
    expect(result.current.myRole).toBe('owner');

    act(() => result.current.actions.setRole('member-suin', 'coOwner'));
    expect(result.current.members?.map((member) => member.name)).toEqual([
      '은우링링링',
      '경진',
      '수인',
      '경준',
      '지예',
    ]);

    act(() => result.current.actions.remove('member-kyungjun'));
    expect(result.current.members).toHaveLength(4);

    act(() => result.current.actions.transferOwner('member-jiye'));
    expect(result.current.myRole).toBe('member');
    expect(result.current.members?.[0]?.name).toBe('지예');
  });

  it('번치를 아직 모르면 멤버와 역할이 없다', () => {
    const { result } = renderHook(() => useBunchMembers(undefined));
    expect(result.current.members).toBeUndefined();
    expect(result.current.myRole).toBeUndefined();
  });
});

describe('BunchRoleGuide', () => {
  it('번치·번들 권한 표를 역할 열과 허용 기호 이름으로 읽을 수 있게 그린다', () => {
    render(<BunchRoleGuide />);

    const bunchTable = screen.getByRole('table', { name: '번치 역할별 권한' });
    const row = within(bunchTable).getByRole('row', { name: /번치 정보 바꾸기/ });
    expect(within(row).getByRole('img', { name: '모두 허용' })).toBeInTheDocument();
    expect(within(row).getByRole('img', { name: '권한 없음' })).toBeInTheDocument();

    const bundleTable = screen.getByRole('table', { name: '번들 역할별 권한' });
    expect(within(bundleTable).getAllByRole('columnheader')).toHaveLength(4);
    expect(
      within(bundleTable).getAllByRole('img', { name: '일부 허용, 해당 번들에 참여한 경우만' }),
    ).toHaveLength(6);
  });
});
