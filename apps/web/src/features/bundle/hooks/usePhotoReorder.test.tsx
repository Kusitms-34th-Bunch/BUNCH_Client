import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ADD_CARD_ID } from '../constants/photoList';
import { usePhotoReorder } from './usePhotoReorder';

const photoIds = ['a', 'b', 'c'];
// 끌기 시작 이벤트(끌기 시작한 사진의 id가 알림에 실림)
const dragStart = (active: string) => ({ active: { id: active } }) as DragStartEvent;
const dragEnd = (active: string, over: string | null) =>
  ({ active: { id: active }, over: over === null ? null : { id: over } }) as DragEndEvent;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePhotoReorder', () => {
  it('놓은 사진의 자리를 인자로 한 번만 옮긴다', () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => usePhotoReorder({ photoIds, onMove }));

    act(() => result.current.onDragEnd(dragEnd('a', 'c')));

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith('a', 2);
  });

  it('제자리에 놓거나 사진 밖에 놓으면 옮기지 않는다', () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => usePhotoReorder({ photoIds, onMove }));

    act(() => result.current.onDragEnd(dragEnd('b', 'b')));
    act(() => result.current.onDragEnd(dragEnd('b', null)));

    expect(onMove).not.toHaveBeenCalled();
  });

  it('끄는 동안만 dragging이고 놓거나 취소하면 풀린다', () => {
    const { result } = renderHook(() => usePhotoReorder({ photoIds, onMove: vi.fn() }));

    act(() => result.current.onDragStart(dragStart('a')));
    expect(result.current.dragging).toBe(true);
    act(() => result.current.onDragEnd(dragEnd('a', null)));
    expect(result.current.dragging).toBe(false);

    act(() => result.current.onDragStart(dragStart('a')));
    act(() => result.current.onDragCancel());
    expect(result.current.dragging).toBe(false);
  });

  it('앱이 백그라운드로 가면 끌던 상태를 풀고 끌기 영역을 새로 만든다(epoch 증가)', () => {
    const { result } = renderHook(() => usePhotoReorder({ photoIds, onMove: vi.fn() }));
    act(() => result.current.onDragStart(dragStart('a')));
    const before = result.current.dragEpoch;

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.dragEpoch).toBe(before + 1);
    expect(result.current.dragging).toBe(false);
  });

  it('화면에 보일 때의 visibilitychange에는 반응하지 않는다', () => {
    const { result } = renderHook(() => usePhotoReorder({ photoIds, onMove: vi.fn() }));
    const before = result.current.dragEpoch;

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.dragEpoch).toBe(before);
  });

  it('「사진 추가」 칸에 놓으면 맨 뒤 사진 자리로 옮기고, 이미 맨 뒤면 옮기지 않는다', () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => usePhotoReorder({ photoIds, onMove }));

    act(() => result.current.onDragEnd(dragEnd('a', ADD_CARD_ID)));
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith('a', 2);

    act(() => result.current.onDragEnd(dragEnd('c', ADD_CARD_ID)));
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  describe('끌기 상태 알림(onDragStateChange)', () => {
    it('시작과 끝에 한 번씩만 알리고, 놓기와 취소가 겹쳐도 두 번 알리지 않는다', () => {
      const onDragStateChange = vi.fn();
      const { result } = renderHook(() =>
        usePhotoReorder({ photoIds, onMove: vi.fn(), onDragStateChange }),
      );

      act(() => result.current.onDragStart(dragStart('a')));
      act(() => result.current.onDragEnd(dragEnd('a', 'c')));
      act(() => result.current.onDragCancel());

      expect(onDragStateChange.mock.calls).toEqual([[true, 'a'], [false]]);
    });

    it('끄는 중 앱이 백그라운드로 가면 놓은 것으로 알린다', () => {
      const onDragStateChange = vi.fn();
      const { result } = renderHook(() =>
        usePhotoReorder({ photoIds, onMove: vi.fn(), onDragStateChange }),
      );
      act(() => result.current.onDragStart(dragStart('a')));

      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(onDragStateChange.mock.calls).toEqual([[true, 'a'], [false]]);
    });

    it('끄는 중 화면이 사라져도 놓은 것으로 알려 작업 중 표시가 남지 않게 한다', () => {
      const onDragStateChange = vi.fn();
      const { result, unmount } = renderHook(() =>
        usePhotoReorder({ photoIds, onMove: vi.fn(), onDragStateChange }),
      );
      act(() => result.current.onDragStart(dragStart('a')));

      unmount();

      expect(onDragStateChange.mock.calls).toEqual([[true, 'a'], [false]]);
    });

    it('끌지 않았으면 화면이 사라져도 알리지 않는다', () => {
      const onDragStateChange = vi.fn();
      const { unmount } = renderHook(() =>
        usePhotoReorder({ photoIds, onMove: vi.fn(), onDragStateChange }),
      );

      unmount();

      expect(onDragStateChange).not.toHaveBeenCalled();
    });
  });
});
