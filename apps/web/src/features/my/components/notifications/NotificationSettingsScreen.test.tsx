import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationSettings } from '../../lib/types';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';

const backOr = vi.fn();
vi.mock('@/shared/hooks/useBackOr', () => ({ useBackOr: () => backOr }));

const TYPE_TITLES = ['번들 소식', '멤버 및 권한 소식', '팔로우', '좋아요 및 댓글'];
const ALL_ON: NotificationSettings = {
  push: true,
  types: { bundle: true, member: true, follow: true, reaction: true },
};

const toggle = (name: string) => screen.getByRole<HTMLInputElement>('switch', { name });
const typeToggles = () =>
  within(screen.getByRole('region', { name: '받을 알림' })).getAllByRole<HTMLInputElement>(
    'switch',
  );

const onChangePush = vi.fn();
const onChangeType = vi.fn();

const props = (overrides: Partial<Parameters<typeof NotificationSettingsScreen>[0]> = {}) => ({
  settings: ALL_ON,
  devicePermission: 'granted' as const,
  onChangePush,
  onChangeType,
  ...overrides,
});
const renderScreen = (overrides: Partial<Parameters<typeof NotificationSettingsScreen>[0]> = {}) =>
  render(<NotificationSettingsScreen {...props(overrides)} />);

beforeEach(() => vi.clearAllMocks());

describe('NotificationSettingsScreen', () => {
  it('앱 푸시 전체와 받을 알림 네 종류를 받은 값으로 보여 준다', () => {
    renderScreen({
      settings: {
        push: true,
        types: { bundle: true, member: false, follow: true, reaction: false },
      },
    });

    expect(toggle('앱 푸시 알림').checked).toBe(true);
    expect(typeToggles().map((input) => input.checked)).toEqual([true, false, true, false]);
    for (const title of TYPE_TITLES) expect(toggle(title)).toBeTruthy();
  });

  it('종류별 토글을 누르면 그 종류와 바꿀 값만 알린다', async () => {
    renderScreen();

    await userEvent.click(toggle('팔로우'));

    expect(onChangeType).toHaveBeenCalledWith('follow', false);
    expect(onChangeType).toHaveBeenCalledTimes(1);
    expect(onChangePush).not.toHaveBeenCalled();
  });

  it('앱 푸시 전체 토글을 누르면 바꿀 값을 알린다', async () => {
    renderScreen();

    await userEvent.click(toggle('앱 푸시 알림'));

    expect(onChangePush).toHaveBeenCalledWith(false);
    expect(onChangeType).not.toHaveBeenCalled();
  });

  it('받을 알림이 모두 꺼져 있어도 앱 푸시 알림은 켜진 채로 두고 종류 토글도 누를 수 있다', () => {
    renderScreen({
      settings: {
        push: true,
        types: { bundle: false, member: false, follow: false, reaction: false },
      },
    });

    expect(toggle('앱 푸시 알림').checked).toBe(true);
    expect(typeToggles().every((input) => !input.checked && !input.disabled)).toBe(true);
    // 자동으로 꺼졌다는 안내 낭독도 없음
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('전체가 꺼져 있으면 종류별 값은 그대로 보이고 누를 수 없다', () => {
    renderScreen({
      settings: {
        push: false,
        types: { bundle: true, member: false, follow: true, reaction: true },
      },
    });

    expect(toggle('앱 푸시 알림').checked).toBe(false);
    expect(typeToggles().every((input) => input.disabled)).toBe(true);
    expect(typeToggles().map((input) => input.checked)).toEqual([true, false, true, true]);
  });

  it('기기 알림 권한이 꺼져 있으면 배너를 띄우고 모든 토글을 값 그대로 막는다', () => {
    renderScreen({ devicePermission: 'denied' });

    expect(screen.getByText('알림 설정이 꺼져 있어요.')).toBeTruthy();
    expect(toggle('앱 푸시 알림').disabled).toBe(true);
    expect(toggle('앱 푸시 알림').checked).toBe(true);
    expect(typeToggles().every((input) => input.disabled && input.checked)).toBe(true);
    // 막힌 이유(배너 문구)를 토글 설명으로 함께 읽음
    expect(toggle('앱 푸시 알림')).toHaveAccessibleDescription(/알림 설정이 꺼져 있어요\./);
    for (const input of typeToggles()) {
      expect(input).toHaveAccessibleDescription(/알림 설정이 꺼져 있어요\./);
    }
  });

  it('「설정으로 이동」은 기기 설정 열기가 연결됐을 때만 보이고 누르면 연다', async () => {
    const onOpenDeviceSettings = vi.fn();
    const { rerender } = renderScreen({ devicePermission: 'denied' });
    expect(screen.queryByRole('button', { name: '설정으로 이동' })).toBeNull();

    rerender(
      <NotificationSettingsScreen
        {...props({ devicePermission: 'denied', onOpenDeviceSettings })}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '설정으로 이동' }));

    expect(onOpenDeviceSettings).toHaveBeenCalledTimes(1);
  });

  it('기기 권한이 꺼졌다 다시 켜지면 배너만 사라지고 받은 값은 그대로다', () => {
    const settings: NotificationSettings = {
      push: true,
      types: { bundle: true, member: true, follow: false, reaction: true },
    };
    const { rerender } = renderScreen({ settings });
    const values = typeToggles().map((input) => input.checked);

    rerender(<NotificationSettingsScreen {...props({ settings, devicePermission: 'denied' })} />);
    expect(typeToggles().every((input) => input.disabled)).toBe(true);
    expect(typeToggles().map((input) => input.checked)).toEqual(values);

    rerender(<NotificationSettingsScreen {...props({ settings, devicePermission: 'granted' })} />);
    expect(screen.queryByText('알림 설정이 꺼져 있어요.')).toBeNull();
    expect(typeToggles().every((input) => !input.disabled)).toBe(true);
    expect(typeToggles().map((input) => input.checked)).toEqual(values);
  });

  it('기기 알림 권한을 확인하는 동안에는 배너 없이 모든 토글을 값 그대로 막는다', () => {
    renderScreen({ devicePermissionChecking: true });

    expect(screen.queryByText('알림 설정이 꺼져 있어요.')).toBeNull();
    expect(toggle('앱 푸시 알림').disabled).toBe(true);
    expect(toggle('앱 푸시 알림').checked).toBe(true);
    expect(typeToggles().every((input) => input.disabled && input.checked)).toBe(true);
  });

  it('기기 알림 권한이 켜져 있으면 배너가 없다', () => {
    renderScreen();

    expect(screen.queryByText('알림 설정이 꺼져 있어요.')).toBeNull();
    expect(toggle('앱 푸시 알림')).not.toHaveAccessibleDescription(/꺼져 있어요/);
  });

  it('뒤로 가기는 MY로 돌아간다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(backOr).toHaveBeenCalledWith('/my');
  });
});
