import type * as DesignSystem from '@app/design-system';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BunchDeleteScreen } from './BunchDeleteScreen';
import { BunchMenuScreen } from './BunchMenuScreen';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast,
}));

const screenProps = {
  bunchName: '퇴근런클럽',
  memberNames: ['은우링링링(나)', '경진'],
  onBack: vi.fn(),
  onNext: vi.fn(),
  onDelete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('번치 삭제 입구', () => {
  it('메인 관리자 메뉴의 「번치 삭제」는 삭제 안내로 간다', () => {
    render(
      <BunchMenuScreen bunchName="퇴근런클럽" myRole="owner" onBack={vi.fn()} onLeave={vi.fn()} />,
    );

    expect(screen.getByRole('link', { name: '번치 삭제' })).toHaveAttribute(
      'href',
      '/bunch/menu/delete',
    );
  });
});

describe('BunchDeleteScreen', () => {
  it('안내는 받침에 맞는 조사로 제목을 쓰고 삭제되는 항목과 「다음」을 보여 준다', async () => {
    const onNext = vi.fn();
    render(<BunchDeleteScreen {...screenProps} step="info" onNext={onNext} />);

    expect(
      screen.getByRole('heading', { level: 1, name: '퇴근런클럽을 삭제할까요?' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(BUNCH_HOME_MESSAGES.deleteTitle('여행가조')).toBe('여행가조를 삭제할까요?');
    expect(BUNCH_HOME_MESSAGES.deleteTitle('Run 7')).toBe('Run 7를 삭제할까요?');
  });

  it('확인 문구를 정확히 입력해야 「삭제하기」가 켜지고, 누르면 삭제한다', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<BunchDeleteScreen {...screenProps} step="confirm" onDelete={onDelete} />);
    const input = screen.getByRole('textbox', { name: '확인 문구 입력' });
    const button = screen.getByRole('button', { name: '삭제하기' });

    expect(input).toHaveAccessibleDescription(BUNCH_HOME_MESSAGES.deleteConfirmHint);
    expect(button).toBeDisabled();
    await user.type(input, '삭제');
    expect(button).toBeDisabled();
    await user.type(input, '하기');
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('확인 문구를 맞게 입력하고 Enter를 누르면 삭제한다', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<BunchDeleteScreen {...screenProps} step="confirm" onDelete={onDelete} />);

    await user.type(screen.getByRole('textbox', { name: '확인 문구 입력' }), '삭제하기{Enter}');

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('확인 문구가 틀리면 Enter를 눌러도 삭제하지 않는다', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<BunchDeleteScreen {...screenProps} step="confirm" onDelete={onDelete} />);

    await user.type(screen.getByRole('textbox', { name: '확인 문구 입력' }), '삭제{Enter}');

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('삭제할 번치 정보에 번치명과 소속 멤버를 보여 준다', () => {
    render(<BunchDeleteScreen {...screenProps} step="confirm" />);

    expect(screen.getByText('퇴근런클럽')).toBeInTheDocument();
    expect(screen.getByText('은우링링링(나), 경진')).toBeInTheDocument();
  });
});
