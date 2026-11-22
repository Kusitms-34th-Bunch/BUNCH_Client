import { act, render } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBunchSwitchMotion } from './useBunchSwitchMotion';

// iOS 쉘: 화면 전체(상태 바·시스템 탭 바 포함)는 쉘이 움직이고 웹은 시작·끝만 알림
const bridge = vi.hoisted(() => ({
  beginScreenSwitch: vi.fn((_tab: string | null) => Promise.resolve(true)),
  finishScreenSwitch: vi.fn(() => Promise.resolve()),
  cancelScreenSwitch: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/shared/bridge/client', () => ({
  appBridge: bridge,
  hasNativeMethod: () => true,
  nativeShellTab: () => 'bunch',
}));

type Motion = ReturnType<typeof useBunchSwitchMotion>;
let motion: Motion | undefined;
const keepMotion = (value: Motion) => {
  motion = value;
};
function Screen({ bunchId }: { bunchId: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const value = useBunchSwitchMotion(contentRef, bunchId);
  useEffect(() => keepMotion(value));
  return (
    <div data-app-background="orange-50">
      <div key={bunchId} ref={contentRef} />
    </div>
  );
}

const nextFrames = () =>
  act(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0))),
      ),
  );

// 쉘이 덮었다고 답할 때까지(begin 응답) 기다림
const covered = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

describe('useBunchSwitchMotion(iOS 쉘)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('고르면 쉘이 화면을 덮고, 새 번치가 그려진 뒤 쉘에 끝을 알린다(웹 복제본은 만들지 않음)', async () => {
    const { rerender } = render(<Screen bunchId="1" />);

    act(() => motion!.begin());
    expect(bridge.beginScreenSwitch).toHaveBeenCalledWith('bunch');
    expect(document.querySelector('[data-bunch-switch-snapshot]')).toBeNull();
    await covered();

    rerender(<Screen bunchId="2" />);
    expect(bridge.finishScreenSwitch).not.toHaveBeenCalled();
    await nextFrames();
    expect(bridge.finishScreenSwitch).toHaveBeenCalledTimes(1);
    expect(bridge.cancelScreenSwitch).not.toHaveBeenCalled();
  });

  it('덮이기 전에 새 번치가 먼저 그려지면 모션 없이 바뀌고, 늦게 덮이면 바로 치운다', async () => {
    const { rerender } = render(<Screen bunchId="1" />);

    act(() => motion!.begin());
    rerender(<Screen bunchId="2" />);
    await covered();
    await nextFrames();
    expect(bridge.finishScreenSwitch).not.toHaveBeenCalled();
    expect(bridge.cancelScreenSwitch).toHaveBeenCalledTimes(1);
  });

  it('전환에 실패하거나 화면이 사라지면 덮은 화면을 치운다', async () => {
    const { unmount } = render(<Screen bunchId="1" />);

    act(() => motion!.begin());
    await covered();
    act(() => motion!.cancel());
    expect(bridge.cancelScreenSwitch).toHaveBeenCalledTimes(1);

    act(() => motion!.begin());
    await covered();
    unmount();
    expect(bridge.cancelScreenSwitch).toHaveBeenCalledTimes(2);
    expect(bridge.finishScreenSwitch).not.toHaveBeenCalled();
  });

  it('새 번치를 그린 뒤 끝을 알리기 전에 화면이 사라지면 덮개를 치운다', async () => {
    const { rerender, unmount } = render(<Screen bunchId="1" />);

    act(() => motion!.begin());
    await covered();
    rerender(<Screen bunchId="2" />);
    unmount();
    expect(bridge.finishScreenSwitch).not.toHaveBeenCalled();
    expect(bridge.cancelScreenSwitch).toHaveBeenCalledTimes(1);
  });

  it('시트에서 골랐으면 시트가 다 닫힌 뒤에 쉘이 화면을 찍는다(닫히는 시트가 사진에 남지 않게)', async () => {
    render(<Screen bunchId="1" />);
    const sheet = document.body.appendChild(document.createElement('div'));
    sheet.setAttribute('data-bottom-sheet', '');

    act(() => motion!.begin());
    await nextFrames();
    expect(bridge.beginScreenSwitch).not.toHaveBeenCalled();

    sheet.remove();
    await nextFrames();
    expect(bridge.beginScreenSwitch).toHaveBeenCalledWith('bunch');
  });
});
