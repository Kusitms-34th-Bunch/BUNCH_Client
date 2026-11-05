import { render, screen, within } from '@testing-library/react';
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

  it('첫 진입에서는 닫기 버튼이 있지만 동작은 아직 연결하지 않았다', async () => {
    render(<BunchStartSelect />);

    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '닫기' }));

    expect(back).not.toHaveBeenCalled();
  });

  it('번치 홈에서 들어오면 닫기가 이전 화면으로 돌아간다', async () => {
    window.history.pushState(null, '', '/onboarding?from=bunch');
    render(<BunchStartSelect closeBackHref="/bunch" />);

    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '닫기' }));

    expect(back).toHaveBeenCalledTimes(1);
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
    expect(screen.getByRole('button', { name: /초대받은 번치 참여하기/ })).toBeTruthy();
  });

  it('새 번치 만들기를 누르면 번치 만들기 경로로 이동한다', async () => {
    render(<BunchStartSelect />);

    await userEvent.click(screen.getByRole('button', { name: /새 번치 만들기/ }));

    // 앞으로 이동할 때 오른쪽에서 들어오는 전환 확인
    expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunch);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('초대받은 번치 참여하기를 누르면 참여 경로로 이동한다', async () => {
    render(<BunchStartSelect />);

    await userEvent.click(screen.getByRole('button', { name: /초대받은 번치 참여하기/ }));

    expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunch);
    expect(push).toHaveBeenCalledTimes(1);
  });
});
