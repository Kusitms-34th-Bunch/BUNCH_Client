import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { BunchMenu } from './BunchMenu';
import { BunchMenuScreen } from './BunchMenuScreen';

const replace = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, back }) }));

beforeEach(() => {
  sessionStorage.clear();
  replace.mockClear();
  back.mockClear();
});

const menuNames = () => screen.getAllByRole('listitem').map((item) => item.textContent?.trim());

describe('BunchMenuScreen', () => {
  it('메인 관리자는 프로필 편집·번치 삭제를 포함한 6개 메뉴를 본다', () => {
    render(
      <BunchMenuScreen bunchName="여행가조" myRole="owner" onBack={vi.fn()} onLeave={vi.fn()} />,
    );

    expect(menuNames()).toEqual([
      '프로필 편집',
      '멤버 관리',
      '멤버 초대',
      '차단 목록',
      '번치 나가기',
      '번치 삭제',
    ]);
  });

  it.each(['coOwner', 'member'] as const)('%s는 4개 메뉴만 본다', (role) => {
    render(
      <BunchMenuScreen bunchName="여행가조" myRole={role} onBack={vi.fn()} onLeave={vi.fn()} />,
    );

    expect(menuNames()).toEqual(['멤버 관리', '멤버 초대', '차단 목록', '번치 나가기']);
  });

  it('메인 관리자가 아니면 번치 나가기에서 확인 창을 열고(첫 초점 취소), 취소하면 나가지 않고 초점이 돌아온다', async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn();
    render(
      <BunchMenuScreen bunchName="여행가조" myRole="member" onBack={vi.fn()} onLeave={onLeave} />,
    );

    await user.click(screen.getByRole('button', { name: '번치 나가기' }));
    const dialog = await screen.findByRole('alertdialog', { name: '여행가조 번치를 나갈까요?' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: '취소' })),
    );
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(onLeave).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: '번치 나가기' })),
    );
  });

  it('확인 창에서 나가기를 누르면 onLeave를 부른다', async () => {
    const user = userEvent.setup();
    const onLeave = vi.fn();
    render(
      <BunchMenuScreen bunchName="여행가조" myRole="coOwner" onBack={vi.fn()} onLeave={onLeave} />,
    );

    await user.click(screen.getByRole('button', { name: '번치 나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '나가기' }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('메인 관리자의 프로필 편집은 편집 화면으로 가는 링크다', () => {
    render(
      <BunchMenuScreen bunchName="여행가조" myRole="owner" onBack={vi.fn()} onLeave={vi.fn()} />,
    );

    expect(screen.getByRole('link', { name: '프로필 편집' }).getAttribute('href')).toBe(
      BUNCH_HOME_PATHS.profile,
    );
  });

  it('멤버 관리·멤버 초대·차단 목록은 각 화면으로 가는 링크다', () => {
    render(
      <BunchMenuScreen bunchName="여행가조" myRole="member" onBack={vi.fn()} onLeave={vi.fn()} />,
    );

    expect(screen.getByRole('link', { name: '멤버 관리' }).getAttribute('href')).toBe(
      BUNCH_HOME_PATHS.members,
    );
    expect(screen.getByRole('link', { name: '멤버 초대' }).getAttribute('href')).toBe(
      BUNCH_HOME_PATHS.invite,
    );
    expect(screen.getByRole('link', { name: '차단 목록' }).getAttribute('href')).toBe(
      BUNCH_HOME_PATHS.blocked,
    );
  });

  it('역할을 아직 모르면(첫 hydration) 메뉴를 그리지 않는다', () => {
    render(
      <BunchMenuScreen
        bunchName={undefined}
        myRole={undefined}
        onBack={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1, name: '번치 더보기' })).toBeTruthy();
  });

  it('메인 관리자의 번치 나가기는 확인 창을 열지 않는다', async () => {
    const user = userEvent.setup();
    render(
      <BunchMenuScreen bunchName="여행가조" myRole="owner" onBack={vi.fn()} onLeave={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: '번치 나가기' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('BunchMenu', () => {
  it('돌아갈 기록이 없으면 뒤로 가기가 번치 홈으로 바꾼다', async () => {
    const user = userEvent.setup();
    render(<BunchMenu />);

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.home);
  });
  it('번치 홈에서 고른 번치의 내 역할로 메뉴를 보여 준다', () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-gift');
    render(<BunchMenu />);

    expect(menuNames()).toEqual(['멤버 관리', '멤버 초대', '차단 목록', '번치 나가기']);
  });
});
