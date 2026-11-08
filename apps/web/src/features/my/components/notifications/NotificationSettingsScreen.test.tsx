import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationSettingsFixture } from '../../fixtures/notificationSettings.fixture';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';

const backOr = vi.fn();
vi.mock('@/shared/hooks/useBackOr', () => ({ useBackOr: () => backOr }));

const TYPE_TITLES = ['번들 소식', '뭉치 성장', '멤버 및 권한 소식', '팔로우', '좋아요 및 댓글'];

const toggle = (name: string) => screen.getByRole<HTMLInputElement>('switch', { name });
const typeToggles = () =>
  within(screen.getByRole('region', { name: '받을 알림' })).getAllByRole<HTMLInputElement>(
    'switch',
  );

const renderScreen = (props: Partial<Parameters<typeof NotificationSettingsScreen>[0]> = {}) =>
  render(
    <NotificationSettingsScreen
      settings={notificationSettingsFixture}
      devicePermission="granted"
      {...props}
    />,
  );

beforeEach(() => vi.clearAllMocks());

describe('NotificationSettingsScreen', () => {
  it('앱 푸시 전체와 받을 알림 다섯 종류를 지금 값으로 보여 준다', () => {
    renderScreen({
      settings: {
        push: true,
        types: { bundle: true, growth: false, member: true, follow: false, reaction: true },
      },
    });

    expect(toggle('앱 푸시 알림').checked).toBe(true);
    expect(typeToggles().map((input) => input.checked)).toEqual([true, false, true, false, true]);
    for (const title of TYPE_TITLES) expect(toggle(title)).toBeTruthy();
  });

  it('종류별 토글은 그 종류만 바꾸고 다른 종류와 전체 토글은 그대로 둔다', async () => {
    renderScreen();

    await userEvent.click(toggle('팔로우'));

    expect(toggle('팔로우').checked).toBe(false);
    expect(typeToggles().filter((input) => input.checked)).toHaveLength(4);
    expect(toggle('앱 푸시 알림').checked).toBe(true);
  });

  it('받을 알림을 모두 끄면 앱 푸시 알림도 꺼진다', async () => {
    renderScreen();

    for (const title of TYPE_TITLES.slice(0, -1)) await userEvent.click(toggle(title));
    expect(toggle('앱 푸시 알림').checked).toBe(true);

    await userEvent.click(toggle(TYPE_TITLES.at(-1) ?? ''));
    expect(toggle('앱 푸시 알림').checked).toBe(false);
    expect(toggle('앱 푸시 알림')).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('앱 푸시 알림도 꺼졌어요');
    expect(typeToggles().every((input) => !input.checked)).toBe(true);

    // 앱 푸시를 다시 켜도 종류는 모두 꺼진 채
    await userEvent.click(toggle('앱 푸시 알림'));
    expect(toggle('앱 푸시 알림').checked).toBe(true);
    expect(typeToggles().every((input) => !input.checked && !input.disabled)).toBe(true);
  });

  it('전체를 끄면 종류별 값은 유지한 채 막고, 다시 켜면 그 값으로 돌아온다', async () => {
    renderScreen();
    await userEvent.click(toggle('뭉치 성장'));

    await userEvent.click(toggle('앱 푸시 알림'));
    expect(typeToggles().every((input) => input.disabled)).toBe(true);
    expect(typeToggles().map((input) => input.checked)).toEqual([true, false, true, true, true]);

    await userEvent.click(toggle('앱 푸시 알림'));
    expect(typeToggles().every((input) => !input.disabled)).toBe(true);
    expect(typeToggles().map((input) => input.checked)).toEqual([true, false, true, true, true]);
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
        settings={notificationSettingsFixture}
        devicePermission="denied"
        onOpenDeviceSettings={onOpenDeviceSettings}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '설정으로 이동' }));

    expect(onOpenDeviceSettings).toHaveBeenCalledTimes(1);
  });

  it('기기 권한이 꺼졌다 다시 켜지면 배너만 사라지고 바꾼 값은 그대로다', async () => {
    const { rerender } = renderScreen();
    await userEvent.click(toggle('팔로우'));
    const values = typeToggles().map((input) => input.checked);

    rerender(
      <NotificationSettingsScreen
        settings={notificationSettingsFixture}
        devicePermission="denied"
      />,
    );
    expect(typeToggles().every((input) => input.disabled)).toBe(true);
    expect(typeToggles().map((input) => input.checked)).toEqual(values);

    rerender(
      <NotificationSettingsScreen
        settings={notificationSettingsFixture}
        devicePermission="granted"
      />,
    );
    expect(screen.queryByText('알림 설정이 꺼져 있어요.')).toBeNull();
    expect(typeToggles().every((input) => !input.disabled)).toBe(true);
    expect(typeToggles().map((input) => input.checked)).toEqual(values);
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
