import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftPhoto } from '../lib/types';
import { usePhotoRemoval } from './usePhotoRemoval';

const photo = (id: string, caption = ''): DraftPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  caption,
  takenAt: null,
  uploaderId: 'jiye',
});

const calls: string[] = [];
const removePhoto = vi.fn((id: string) => calls.push(`removePhoto:${id}`));
const list = {
  current: 1,
  setActiveIndex: vi.fn((value: unknown) => calls.push(`setActiveIndex:${String(value)}`)),
  scrollToIndex: vi.fn((index: number) => calls.push(`scrollToIndex:${index}`)),
  pauseSnap: vi.fn(() => calls.push('pauseSnap')),
  focusPhotoView: vi.fn((index: number, delay: number) => calls.push(`focus:${index}:${delay}`)),
};
const onDenied = vi.fn();
const onBlocked = vi.fn();
const announce = vi.fn();

const three = [photo('a', '가'), photo('b'), photo('c')];

const setup = (photos: readonly DraftPhoto[], { canEdit = true, locked = [] as string[] } = {}) =>
  renderHook(() =>
    usePhotoRemoval({
      photos,
      removePhoto,
      list,
      canEdit,
      isLocked: (id) => locked.includes(id),
      onDenied,
      onBlocked,
      announce,
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  list.current = 1;
});

describe('usePhotoRemoval', () => {
  it('확인 창에서 「삭제하기」를 누르면 스냅 끄기 → 지우기 → 새 자리 활성 번호 → 포커스 예약 → (다음 렌더에서) 스크롤 순서로 처리한다', () => {
    const { result, rerender } = setup(three);

    act(() => result.current.requestRemove(three[1]!));
    act(() => result.current.confirmRemove());
    rerender();

    expect(calls).toEqual([
      'pauseSnap',
      'removePhoto:b',
      'setActiveIndex:1',
      'focus:1:150',
      'scrollToIndex:1',
    ]);
    expect(announce).toHaveBeenCalledWith({ text: '사진을 뺐어요. 2장이 남았어요.', index: 1 });
    expect(result.current.removeDialog).toBeUndefined();
  });

  it('스크롤 보정은 지운 결과를 그리는 다음 렌더에서 한 번만 한다', () => {
    const { result, rerender } = setup(three);

    act(() => result.current.requestRemove(three[1]!));
    expect(list.scrollToIndex).not.toHaveBeenCalled();
    act(() => result.current.confirmRemove());
    // 확정으로 다시 그려지는 렌더에서 한 번만 보정
    expect(list.scrollToIndex).toHaveBeenCalledTimes(1);
    rerender();
    expect(list.scrollToIndex).toHaveBeenCalledTimes(1);
    rerender();
    expect(list.scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('마지막 사진을 빼면 앞 사진 자리(끝 번호)로 맞춘다', () => {
    list.current = 2;
    const { result, rerender } = setup(three);

    act(() => result.current.requestRemove(three[2]!));
    act(() => result.current.confirmRemove());
    rerender();

    expect(calls).toContain('setActiveIndex:1');
    expect(calls).toContain('scrollToIndex:1');
  });

  it('사진을 빼려면 확인 창을 열고, 확정하면 확인 창이 닫히는 시간(150ms) 뒤에 포커스를 옮긴다', () => {
    list.current = 0;
    const { result } = setup(three);

    act(() => result.current.requestRemove(three[0]!));
    expect(result.current.removeDialog).toEqual({ kind: 'confirm', photoId: 'a' });
    expect(removePhoto).not.toHaveBeenCalled();

    act(() => result.current.confirmRemove());
    expect(removePhoto).toHaveBeenCalledWith('a');
    expect(list.focusPhotoView).toHaveBeenCalledWith(0, 150);
    expect(result.current.removeDialog).toBeUndefined();
  });

  it('마지막 한 장이면 빼지 않고 안내 창만 연다', () => {
    const only = photo('only', '유일');
    const { result } = setup([only]);

    act(() => result.current.requestRemove(only));

    expect(result.current.removeDialog).toEqual({ kind: 'last', photoId: 'only' });
    expect(removePhoto).not.toHaveBeenCalled();
  });

  it('참여 멤버가 아니면 못 빼고 안내한다', () => {
    const { result } = setup(three, { canEdit: false });

    act(() => result.current.requestRemove(three[1]!));

    expect(onDenied).toHaveBeenCalledTimes(1);
    expect(removePhoto).not.toHaveBeenCalled();
  });

  it('다른 멤버가 편집 중인 사진은 못 빼고 안내한다', () => {
    const { result } = setup(three, { locked: ['b'] });

    act(() => result.current.requestRemove(three[1]!));

    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(removePhoto).not.toHaveBeenCalled();
  });

  it('확인 창이 떠 있는 사이 편집 잠금이 걸리면 확정해도 빼지 않는다', () => {
    const locked: string[] = [];
    const { result } = renderHook(() =>
      usePhotoRemoval({
        photos: three,
        removePhoto,
        list,
        canEdit: true,
        isLocked: (id) => locked.includes(id),
        onDenied,
        onBlocked,
        announce,
      }),
    );
    act(() => result.current.requestRemove(three[0]!));
    locked.push('a');

    act(() => result.current.confirmRemove());

    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(removePhoto).not.toHaveBeenCalled();
    expect(result.current.removeDialog).toBeUndefined();
  });

  it('확인 창을 닫으면 아무것도 지우지 않는다', () => {
    const { result } = setup(three);
    act(() => result.current.requestRemove(three[0]!));

    act(() => result.current.closeDialog());

    expect(result.current.removeDialog).toBeUndefined();
    expect(removePhoto).not.toHaveBeenCalled();
  });
});
