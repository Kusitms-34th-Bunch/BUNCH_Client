import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScreenOverlay, type ScreenOverlayProps } from './useScreenOverlay';

const Overlay = ({ open: isOpen, onOpenChangeComplete }: ScreenOverlayProps) => (
  <button type="button" data-open={isOpen} onClick={() => onOpenChangeComplete(false)}>
    창
  </button>
);

afterEach(() => {
  vi.clearAllMocks();
});

describe('useScreenOverlay', () => {
  it('다 닫히면 지우고 onClosed를 부른다', async () => {
    const onClosed = vi.fn();
    const { result } = renderHook(() => useScreenOverlay());

    act(() => {
      result.current((props) => <Overlay {...props} />, onClosed);
    });
    const overlay = await screen.findByRole('button', { name: '창' });
    expect(onClosed).not.toHaveBeenCalled();
    act(() => overlay.click());

    await waitFor(() => expect(screen.queryByRole('button', { name: '창' })).toBeNull());
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('화면을 떠나면 열린 창을 지우고 onClosed는 부르지 않는다', async () => {
    const onClosed = vi.fn();
    const { result, unmount } = renderHook(() => useScreenOverlay());

    act(() => {
      result.current((props) => <Overlay {...props} />, onClosed);
    });
    await screen.findByRole('button', { name: '창' });
    unmount();

    await waitFor(() => expect(screen.queryByRole('button', { name: '창' })).toBeNull());
    expect(onClosed).not.toHaveBeenCalled();
  });

  it('live로 열면 화면이 다시 그려질 때 열린 창도 최신 값으로 다시 그린다', async () => {
    const { result, rerender } = renderHook(({ label }) => ({ open: useScreenOverlay(), label }), {
      initialProps: { label: '처음' },
    });
    const latest = { current: () => result.current.label };

    act(() => {
      result.current.open(() => <p>{latest.current()}</p>, undefined, { live: true });
    });
    expect(await screen.findByText('처음')).toBeTruthy();
    rerender({ label: '바뀜' });

    expect(await screen.findByText('바뀜')).toBeTruthy();
  });

  it('closeAll은 열린 창을 닫고 닫힘 완료를 거친다', async () => {
    const onClosed = vi.fn();
    const { result } = renderHook(() => useScreenOverlay());

    act(() => {
      result.current((props) => <Closing {...props} />, onClosed);
    });
    await screen.findByRole('button', { name: '창' });
    act(() => result.current.closeAll());

    await waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1));
  });
});

// 열렸다 닫히면 바로 닫힘 완료를 알림(실제 렌더러의 전환 끝 알림 대신)
function Closing({ open, onOpenChangeComplete }: ScreenOverlayProps) {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) onOpenChangeComplete(false);
  }, [open, onOpenChangeComplete]);
  return open ? <button type="button">창</button> : null;
}
