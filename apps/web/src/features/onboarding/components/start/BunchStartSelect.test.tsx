import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { BunchStartSelect } from './BunchStartSelect';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace }) }));

describe('BunchStartSelect', () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    replace.mockClear();
  });

  it('화면 제목과 본문 영역(main)을 가진다', () => {
    render(<BunchStartSelect />);

    expect(
      screen.getByRole('heading', { level: 1, name: '본격적으로 번치를 시작해볼까요?' }),
    ).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('첫 진입에서 닫기를 누르면 이동하지 않고 중단 확인 모달을 연다', async () => {
    render(<BunchStartSelect />);

    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '닫기' }));

    expect(
      await screen.findByRole('alertdialog', { name: '번치 만들기를 그만둘까요?' }),
    ).toBeTruthy();
    expect(back).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('모달의 계속 만들기와 ESC는 모달만 닫는다', async () => {
    render(<BunchStartSelect />);
    const close = () =>
      userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '닫기' }));

    await close();
    await userEvent.click(await screen.findByRole('button', { name: '계속 만들기' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

    await close();
    await screen.findByRole('alertdialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(replace).not.toHaveBeenCalled();
  });

  it('모달의 나가기는 피드로 대체 이동한다', async () => {
    render(<BunchStartSelect />);

    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '닫기' }));
    await userEvent.click(await screen.findByRole('button', { name: '나가기' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.feed));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('번치 홈에서 들어오면 닫기가 모달 없이 이전 화면으로 돌아간다', async () => {
    window.history.pushState(null, '', '/onboarding?from=bunch');
    render(<BunchStartSelect closeBackHref="/bunch" />);

    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '닫기' }));

    expect(back).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('이전 기록 없이 바로 들어오면 닫기가 지정 경로로 대체 이동한다', async () => {
    const length = vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    render(<BunchStartSelect closeBackHref="/bunch" />);

    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '닫기' }));

    expect(replace).toHaveBeenCalledWith('/bunch');
    expect(back).not.toHaveBeenCalled();
    length.mockRestore();
  });

  it('시작 방식 카드 두 개를 보여 준다', () => {
    render(<BunchStartSelect />);

    expect(screen.getByRole('button', { name: /새 번치 만들기/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /초대 받은 번치 참여하기/ })).toBeTruthy();
  });

  it('새 번치 만들기를 누르면 번치 만들기 경로로 이동한다', async () => {
    render(<BunchStartSelect />);

    await userEvent.click(screen.getByRole('button', { name: /새 번치 만들기/ }));

    // 앞으로 이동할 때 오른쪽에서 들어오는 전환 확인
    expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunch);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('초대 받은 번치 참여하기를 누르면 참여 경로로 이동한다', async () => {
    render(<BunchStartSelect />);

    await userEvent.click(screen.getByRole('button', { name: /초대 받은 번치 참여하기/ }));

    expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunch);
    expect(push).toHaveBeenCalledTimes(1);
  });
});
