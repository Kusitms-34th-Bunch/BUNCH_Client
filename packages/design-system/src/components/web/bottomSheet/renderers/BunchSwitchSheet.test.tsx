import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BunchSwitchSheet, type BunchSwitchItem } from './BunchSwitchSheet';

afterEach(cleanup);

const bunches: BunchSwitchItem[] = [
  { id: 'now', name: '퇴근런클럽', status: 'current' },
  { id: 'trip', name: '여행가조', notificationCount: 5 },
  { id: 'gone', name: '홍대 먹짱', status: 'unavailable' },
];

const renderSheet = (props: Partial<Parameters<typeof BunchSwitchSheet>[0]> = {}) =>
  render(
    <BunchSwitchSheet
      open
      onOpenChange={() => {}}
      bunches={bunches}
      onSelect={() => {}}
      onAdd={() => {}}
      {...props}
    />,
  );

describe('BunchSwitchSheet', () => {
  it('알림 수와 접근 불가를 표시한다', async () => {
    renderSheet();

    expect(await screen.findByRole('dialog', { name: '번치 전환하기' })).toBeTruthy();
    expect(screen.getByText('알림 5개')).toBeTruthy();
    expect(screen.getByText('접근 불가')).toBeTruthy();
  });

  it('고를 수 있는 번치만 onSelect를 부른다', async () => {
    const onSelect = vi.fn();
    renderSheet({ onSelect });

    fireEvent.click(await screen.findByRole('button', { name: /여행가조/ }));
    fireEvent.click(screen.getByRole('button', { name: /퇴근런클럽.*현재 번치/ }));
    fireEvent.click(screen.getByRole('button', { name: /홍대 먹짱/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('trip');
  });

  it('「새로운 번치 추가하기」는 onAdd를 부른다', async () => {
    const onAdd = vi.fn();
    renderSheet({ onAdd });

    fireEvent.click(await screen.findByRole('button', { name: '새로운 번치 추가하기' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('알림 수가 0 이하면 알림 배지를 표시하지 않는다', async () => {
    renderSheet({ bunches: [{ id: 'run', name: '퇴근런클럽', notificationCount: -1 }] });

    await screen.findByRole('dialog');
    expect(screen.queryByText(/알림/)).toBeNull();
  });
});
