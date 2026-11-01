import type * as DesignSystem from '@app/design-system';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlockedBunch } from '../lib/types';
import { useBlockedBunches } from '../hooks/useBlockedBunches';
import { BunchBlockedList } from './BunchBlockedList';
import { BunchBlockedListScreen } from './BunchBlockedListScreen';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), replace: vi.fn() }) }));

vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const BLOCKED: BlockedBunch[] = [
  { id: 'a', name: '야간러너스' },
  { id: 'b', name: '주말산책' },
];

const onUnblock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

const renderScreen = (blocked: readonly BlockedBunch[] | undefined, canUnblock = true) =>
  render(
    <BunchBlockedListScreen
      blocked={blocked}
      canUnblock={canUnblock}
      onUnblock={onUnblock}
      onBack={vi.fn()}
    />,
  );

describe('BunchBlockedListScreen', () => {
  it('차단한 번치 수와 목록, 각 행의 차단해제 버튼을 보여 준다', () => {
    renderScreen(BLOCKED);

    expect(screen.getByText('2개')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '야간러너스차단해제',
      '주말산책차단해제',
    ]);
  });

  it('일반 멤버는 차단해제 버튼 없이 목록만 본다', () => {
    renderScreen(BLOCKED, false);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /차단해제/ })).toBeNull();
  });

  it('차단해제는 확인 창(해제하기·취소)을 거쳐 해제하고 창이 닫힌 뒤 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    renderScreen(BLOCKED);

    await user.click(screen.getByRole('button', { name: '주말산책 차단해제' }));
    const dialog = await screen.findByRole('alertdialog', { name: '주말산책 차단을 해제할까요?' });
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['해제하기', '취소']);
    await user.click(within(dialog).getByRole('button', { name: '해제하기' }));

    expect(onUnblock).toHaveBeenCalledWith('b');
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('주말산책 번치를 차단 해제했어요.', {
        icon: 'success',
        fullWidth: true,
      }),
    );
  });

  it('확인 창에서 취소하면 해제하지 않는다', async () => {
    const user = userEvent.setup();
    renderScreen(BLOCKED);

    await user.click(screen.getByRole('button', { name: '야간러너스 차단해제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onUnblock).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('차단한 번치가 없으면 빈 상태 안내를 보여 준다', () => {
    renderScreen([]);

    expect(screen.getByRole('heading', { name: '아직 차단한 번치가 없어요' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('번치를 아직 모르면(첫 hydration) 목록도 빈 상태도 그리지 않는다', () => {
    renderScreen(undefined);

    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByRole('heading', { name: '아직 차단한 번치가 없어요' })).toBeNull();
  });
});

describe('BunchBlockedListScreen 해제 뒤 초점', () => {
  function Local() {
    const [blocked, setBlocked] = useState(BLOCKED);
    return (
      <BunchBlockedListScreen
        blocked={blocked}
        canUnblock
        onUnblock={(id) => setBlocked((current) => current.filter((bunch) => bunch.id !== id))}
        onBack={vi.fn()}
      />
    );
  }

  it('목록이 남으면 사라진 「차단해제」 대신 개수 줄로 초점을 옮긴다', async () => {
    const user = userEvent.setup();
    render(<Local />);

    await user.click(screen.getByRole('button', { name: '야간러너스 차단해제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '해제하기' }));

    await waitFor(() => expect(document.activeElement).toHaveTextContent('차단된 번치 1개'));
    // 실제 브라우저에서 p가 초점을 받으려면 tabindex 필요(테스트 환경은 없어도 초점을 줌)
    expect(document.activeElement).toHaveAttribute('tabindex', '-1');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});

// 모듈 저장소를 바꾸는 테스트보다 먼저 실행(같은 번치의 fixture 그대로 사용)
describe('BunchBlockedList 역할', () => {
  const renderAs = (bunchId: string) => {
    sessionStorage.setItem('bunch-home:current-bunch-id', bunchId);
    render(<BunchBlockedList />);
  };

  it('메인 관리자 번치에서는 「차단해제」가 보인다', () => {
    renderAs('bunch-run');

    expect(screen.getAllByRole('button', { name: /차단해제$/ })).toHaveLength(2);
  });

  it('일반 멤버 번치에서는 목록만 보이고 「차단해제」가 없다', () => {
    renderAs('bunch-gift');

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /차단해제$/ })).toBeNull();
  });
});

describe('BunchBlockedListScreen + useBlockedBunches', () => {
  function Live() {
    const { blocked, unblock } = useBlockedBunches('bunch-gift');
    return (
      <BunchBlockedListScreen blocked={blocked} canUnblock onUnblock={unblock} onBack={vi.fn()} />
    );
  }

  it('마지막 번치를 해제하면 빈 상태로 바뀌고 초점이 빈 상태 제목으로 간다', async () => {
    const user = userEvent.setup();
    render(<Live />);

    await user.click(screen.getByRole('button', { name: '먹방원정대 차단해제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '해제하기' }));

    const empty = await screen.findByRole('heading', { name: '아직 차단한 번치가 없어요' });
    await waitFor(() => expect(document.activeElement).toBe(empty));
  });
});

describe('useBlockedBunches', () => {
  it('해제한 번치를 목록에서 뺀다', () => {
    const { result } = renderHook(() => useBlockedBunches('bunch-run'));
    expect(result.current.blocked?.map((bunch) => bunch.name)).toEqual(['야간러너스', '주말산책']);

    act(() => result.current.unblock('blocked-night-runners'));

    expect(result.current.blocked?.map((bunch) => bunch.name)).toEqual(['주말산책']);
  });
});
