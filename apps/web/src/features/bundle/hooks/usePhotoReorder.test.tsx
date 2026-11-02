import type { DragEndEvent } from '@dnd-kit/core';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePhotoReorder } from './usePhotoReorder';

const photoIds = ['a', 'b', 'c'];
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

    act(() => result.current.onDragStart());
    expect(result.current.dragging).toBe(true);
    act(() => result.current.onDragEnd(dragEnd('a', null)));
    expect(result.current.dragging).toBe(false);

    act(() => result.current.onDragStart());
    act(() => result.current.onDragCancel());
    expect(result.current.dragging).toBe(false);
  });

  it('앱이 백그라운드로 가면 끌던 상태를 풀고 끌기 영역을 새로 만든다(epoch 증가)', () => {
    const { result } = renderHook(() => usePhotoReorder({ photoIds, onMove: vi.fn() }));
    act(() => result.current.onDragStart());
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
});
