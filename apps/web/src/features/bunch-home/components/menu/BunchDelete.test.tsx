import type * as DesignSystem from '@app/design-system';
import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { useCurrentBunchId } from '../../hooks/useCurrentBunchId';
import { BunchDelete } from './BunchDelete';
import { BunchDeleteScreen } from './BunchDeleteScreen';
import { BunchMenuScreen } from './BunchMenuScreen';

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

describe('BunchDelete', () => {
  // 들어온 길만큼 기록을 쌓아 「돌아갈 기록이 있음」 상태로 둠
  const stackHistory = (count: number) => {
    for (let i = 0; i < count; i += 1) window.history.pushState({}, '', `/step-${i}`);
  };

  it('메인 관리자가 아니면 더보기 메뉴로 돌려보낸다', async () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-gift');
    render(<BunchDelete step="info" />);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch/menu'));
  });

  it('안내의 「다음」은 확인 문구 입력 화면으로 간다', async () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-run');
    render(<BunchDelete step="info" />);

    await userEvent.click(await screen.findByRole('button', { name: '다음' }));

    expect(push).toHaveBeenCalledWith('/bunch/menu/delete/confirm');
  });

  it('소속 멤버는 나를 맨 앞에 「(나)」로 보여 준다', async () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-run');
    render(<BunchDelete step="confirm" />);

    expect(await screen.findByText('은우링링링(나), 경진, 경준, 수인, 지예')).toBeInTheDocument();
  });

  it('삭제하면 세 칸 뒤로(번치 탭으로) 돌아가 다음 번치로 바꾸고 토스트를 띄운다(다시 제출해도 한 번만)', async () => {
    const user = userEvent.setup();
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-run');
    stackHistory(3);
    render(<BunchDelete step="confirm" />);

    // 화면이 빠지는 동안의 Enter 반복·연타
    await user.type(
      await screen.findByRole('textbox', { name: '확인 문구 입력' }),
      '삭제하기{Enter}{Enter}',
    );
    await user.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(go).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledWith(-3);
    expect(toast).toHaveBeenCalledTimes(1);
    // 빠지는 화면은 다음 번치가 아니라 삭제한 번치를 그대로 보여 줌
    expect(screen.getByText('퇴근런클럽')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('퇴근런클럽 번치를 삭제했어요.', expect.anything());
    const { result } = renderHook(() => useCurrentBunchId());
    expect(result.current[0]).toBe('bunch-trip');
    go.mockRestore();
  });
});
