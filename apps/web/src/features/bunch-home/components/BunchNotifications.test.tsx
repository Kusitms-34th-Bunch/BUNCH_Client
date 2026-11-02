import { render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBunchHome } from '../hooks/useBunchHome';
import { BunchHomeHeader } from './BunchHomeHeader';
import { BunchNotifications } from './BunchNotifications';

const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('알림 입구', () => {
  it('번치 홈 헤더의 「알림」은 알림 목록으로 가는 링크다', () => {
    render(<BunchHomeHeader bunchName="여행가조" onBunchClick={vi.fn()} switcherOpen={false} />);

    expect(screen.getByRole('link', { name: '알림' })).toHaveAttribute(
      'href',
      '/bunch/notifications',
    );
  });
});

// 읽음은 모듈 저장소에 남으므로 순서대로 실행(여행가조를 모두 읽는 「모두 읽음」 테스트가 하나씩 읽는 테스트 뒤에 와야 함)
describe('BunchNotifications', () => {
  it('지금 번치의 알림을 최신순으로 보여 주고 읽지 않은 알림을 알린다', async () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-trip');
    render(<BunchNotifications />);

    expect(screen.getByRole('heading', { level: 1, name: '여행가조 알림' })).toBeInTheDocument();
    const cards = within(await screen.findByRole('list')).getAllByRole('button');
    expect(cards).toHaveLength(6);
    expect(cards[0]).toHaveAccessibleName(expect.stringMatching(/방금 전\s*,\s*읽지 않음/));
    expect(cards[5]).not.toHaveAccessibleName(expect.stringContaining('읽지 않음'));
    expect(screen.getByText('알림 받기를 설정하고 유용한 알림을 받아보세요.')).toBeInTheDocument();
  });

  it('알림을 누르면 그 알림만 읽음이 되고 전환 목록의 알림 수도 줄어든다', async () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-trip');
    const user = userEvent.setup();
    render(<BunchNotifications />);
    const { result } = renderHook(() => useBunchHome());
    const tripCount = () =>
      result.current.data?.bunches.find((bunch) => bunch.id === 'bunch-trip')?.alertCount;
    expect(tripCount()).toBe(5);

    const [first, second] = within(await screen.findByRole('list')).getAllByRole('button');
    await user.click(first!);

    expect(first).not.toHaveAccessibleName(expect.stringContaining('읽지 않음'));
    expect(second).toHaveAccessibleName(expect.stringContaining('읽지 않음'));
    expect(tripCount()).toBe(4);
  });

  it('「모두 읽음」을 누르면 지금 번치의 알림만 모두 읽음이 된다', async () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-trip');
    const user = userEvent.setup();
    render(<BunchNotifications />);
    const { result } = renderHook(() => useBunchHome());

    const readAll = screen.getByRole('button', { name: '모두 읽음' });
    await user.click(readAll);

    // 초점은 버튼에 남고 결과는 상태 영역으로 읽힘
    expect(readAll).toHaveFocus();
    expect(await screen.findByText('모든 알림을 읽음으로 바꿨어요.')).toHaveAttribute(
      'role',
      'status',
    );

    const cards = within(screen.getByRole('list')).getAllByRole('button');
    cards.forEach((card) =>
      expect(card).not.toHaveAccessibleName(expect.stringContaining('읽지 않음')),
    );
    const counts = Object.fromEntries(
      (result.current.data?.bunches ?? []).map((bunch) => [bunch.id, bunch.alertCount]),
    );
    expect(counts['bunch-trip']).toBe(0);
    expect(counts['bunch-gift']).toBe(5);
  });

  it('읽을 알림이 없을 때 「모두 읽음」을 누르면 없다고 알린다', async () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-run');
    const user = userEvent.setup();
    render(<BunchNotifications />);

    await user.click(screen.getByRole('button', { name: '모두 읽음' }));

    expect(await screen.findByText('읽지 않은 알림이 없어요.')).toHaveAttribute('role', 'status');
  });

  it('뒤로 가기는 기록이 있으면 되돌아가고, 없으면 번치 홈으로 간다', async () => {
    const user = userEvent.setup();
    render(<BunchNotifications />);
    const length = vi.spyOn(window.history, 'length', 'get');

    length.mockReturnValue(1);
    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(replace).toHaveBeenCalledWith('/bunch');

    length.mockReturnValue(3);
    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(back).toHaveBeenCalledTimes(1);
    length.mockRestore();
  });
});
