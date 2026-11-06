import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BunchLeave } from './BunchLeave';
import { BunchMenu } from './BunchMenu';

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));

// 들어온 길만큼 기록을 쌓아 「돌아갈 기록이 있음」 상태로 둠
const stackHistory = (count: number) => {
  for (let i = 0; i < count; i += 1) window.history.pushState({}, '', `/step-${i}`);
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('나간 뒤 이동', () => {
  it('일반 멤버는 확인 뒤 한 칸 뒤로(번치 탭으로) 돌아가고 메뉴로 replace하지 않는다', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-gift');
    stackHistory(1);
    render(<BunchMenu />);

    await user.click(await screen.findByRole('button', { name: '번치 나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '나가기' }));

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('메인 관리자는 지정하고 나가면 두 칸 뒤로 돌아가고, 다음 번치 역할로 메뉴에 돌려보내지 않는다', async () => {
    const user = userEvent.setup();
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-run');
    stackHistory(2);
    render(<BunchLeave />);

    await user.click(await screen.findByRole('radio', { name: '수인' }));
    await user.click(screen.getByRole('button', { name: '관리자로 지정하기' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: '지정하고 나가기' }));

    expect(go).toHaveBeenCalledWith(-2);
    expect(replace).not.toHaveBeenCalled();
    go.mockRestore();
  });
});
