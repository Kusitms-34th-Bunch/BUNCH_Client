import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftPhoto } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
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
      isPicked: () => false,
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

const clickButton = async (name: string) =>
  fireEvent.click(await screen.findByRole('button', { name }));
const confirmDelete = () => clickButton(BUNDLE_MESSAGES.removeConfirmConfirm);
const expectNoDialog = () => waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

describe('usePhotoRemoval', () => {
  it('확인 창에서 「삭제하기」를 누르면 스냅 끄기 → 지우기 → 새 자리 활성 번호 → (다음 렌더에서) 스크롤 순서로 처리하고 창이 닫힌 뒤 포커스를 옮긴다', async () => {
    const { result, rerender } = setup(three);

    act(() => result.current.requestRemove(three[1]!));
    await confirmDelete();
    rerender();

    expect(calls.filter((call) => !call.startsWith('focus'))).toEqual([
      'pauseSnap',
      'removePhoto:b',
      'setActiveIndex:1',
      'scrollToIndex:1',
    ]);
    // 초점은 확인 창이 다 닫힌 뒤(테스트 환경은 닫힘 전환이 없어 바로 닫힘)
    await waitFor(() => expect(list.focusPhotoView).toHaveBeenCalledWith(1, 0));
    expect(announce).toHaveBeenCalledWith({ text: '사진을 뺐어요. 2장이 남았어요.', index: 1 });
    await expectNoDialog();
  });

  it('스크롤 보정은 지운 결과를 그리는 다음 렌더에서 한 번만 한다', async () => {
    const { result, rerender } = setup(three);

    act(() => result.current.requestRemove(three[1]!));
    expect(list.scrollToIndex).not.toHaveBeenCalled();
    await confirmDelete();
    // 지운 결과를 그리는 렌더에서 한 번만 보정
    rerender();
    expect(list.scrollToIndex).toHaveBeenCalledTimes(1);
    rerender();
    expect(list.scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('마지막 사진을 빼면 앞 사진 자리(끝 번호)로 맞춘다', async () => {
    list.current = 2;
    const { result, rerender } = setup(three);

    act(() => result.current.requestRemove(three[2]!));
    await confirmDelete();
    rerender();

    expect(calls).toContain('setActiveIndex:1');
    expect(calls).toContain('scrollToIndex:1');
  });

  it('사진을 빼려면 확인 창을 열고, 확정하면 확인 창이 다 닫힌 뒤 포커스를 옮긴다', async () => {
    list.current = 0;
    const { result } = setup(three);

    act(() => result.current.requestRemove(three[0]!));
    expect(
      await screen.findByRole('alertdialog', { name: BUNDLE_MESSAGES.removeConfirmTitle }),
    ).toBeTruthy();
    expect(removePhoto).not.toHaveBeenCalled();

    await confirmDelete();
    expect(removePhoto).toHaveBeenCalledWith('a');
    await waitFor(() => expect(list.focusPhotoView).toHaveBeenCalledWith(0, 0));
    await expectNoDialog();
  });

  it('확인 창이 떠 있는 사이 한 장만 남으면 확정해도 빼지 않고 안내 창으로 바꾼다', async () => {
    const { result, rerender } = renderHook(
      ({ photos }: { photos: readonly DraftPhoto[] }) =>
        usePhotoRemoval({
          photos,
          removePhoto,
          list,
          canEdit: true,
          isLocked: () => false,
          isPicked: () => false,
          onDenied,
          onBlocked,
          announce,
        }),
      { initialProps: { photos: three } },
    );
    act(() => result.current.requestRemove(three[0]!));
    expect(
      await screen.findByRole('alertdialog', { name: BUNDLE_MESSAGES.removeConfirmTitle }),
    ).toBeTruthy();

    // 그 사이 다른 멤버가 두 장을 빼 한 장만 남음
    rerender({ photos: [three[0]!] });
    await confirmDelete();

    expect(removePhoto).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('alertdialog', { name: BUNDLE_MESSAGES.removePhotoBlockedTitle }),
    ).toBeTruthy();
  });

  it('마지막 한 장이면 빼지 않고 안내 창만 연다', async () => {
    const only = photo('only', '유일');
    const { result } = setup([only]);

    act(() => result.current.requestRemove(only));

    expect(
      await screen.findByRole('alertdialog', { name: BUNDLE_MESSAGES.removePhotoBlockedTitle }),
    ).toBeTruthy();
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

  it('확인 창이 떠 있는 사이 편집 잠금이 걸리면 확정해도 빼지 않는다', async () => {
    const locked: string[] = [];
    const { result } = renderHook(() =>
      usePhotoRemoval({
        photos: three,
        removePhoto,
        list,
        canEdit: true,
        isLocked: (id) => locked.includes(id),
        isPicked: () => false,
        onDenied,
        onBlocked,
        announce,
      }),
    );
    act(() => result.current.requestRemove(three[0]!));
    locked.push('a');

    await confirmDelete();

    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(removePhoto).not.toHaveBeenCalled();
    await expectNoDialog();
  });

  it('확인 창을 닫으면 아무것도 지우지 않는다', async () => {
    const { result } = setup(three);
    act(() => result.current.requestRemove(three[0]!));

    await clickButton(BUNDLE_MESSAGES.cancel);

    await expectNoDialog();
    expect(removePhoto).not.toHaveBeenCalled();
  });
});
