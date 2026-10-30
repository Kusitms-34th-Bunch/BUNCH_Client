import type * as DesignSystem from '@app/design-system';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PhotoBoxActions,
  PhotoBoxData,
  PhotoBoxPhoto,
  PhotoBoxState,
  SaveResult,
} from '../lib/types';
import { TOAST_ABOVE_TAB_BAR_OFFSET } from '../constants/layout';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { photoBoxFixture } from '../fixtures/photoBox.fixture';
import { MAX_BUNDLE_PHOTOS } from '../lib/photoActions';
import { PhotoBoxScreen } from './PhotoBoxScreen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
// 토스트 표시는 DS의 `toast()` 담당이라 호출 인자만 확인
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const savePhotos = vi.fn<PhotoBoxActions['savePhotos']>();
const deletePhotos = vi.fn<PhotoBoxActions['deletePhotos']>();
const actions: PhotoBoxActions = { savePhotos, deletePhotos };

const ready = (data: PhotoBoxData = photoBoxFixture): PhotoBoxState => ({ kind: 'ready', data });

const photoButtons = () =>
  screen.queryAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'));

const bulk = (count: number, uploaderIds: string[] = ['eunwoo']): PhotoBoxPhoto[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `bulk-${index}`,
    src: `/bulk-${index}.jpg`,
    alt: `사진 ${index}`,
    takenAt: '2026-09-27T10:00',
    uploadedAt: '2026-10-01T00:00:00',
    uploaderIds,
    status: 'ready',
  }));

const dataWith = (photos: PhotoBoxPhoto[], viewer = photoBoxFixture.viewer): PhotoBoxData => ({
  ...photoBoxFixture,
  viewer,
  photos,
});

const renderScreen = (state: PhotoBoxState, props = {}) =>
  render(<PhotoBoxScreen state={state} actions={actions} currentYear={2026} {...props} />);

const startSelecting = async (user: ReturnType<typeof userEvent.setup>, count: number) => {
  await user.click(screen.getByRole('button', { name: '선택' }));
  // 많이 고르는 시나리오가 있어 userEvent 대신 fireEvent로 빠르게 처리
  for (const button of photoButtons().slice(0, count)) fireEvent.click(button);
};

const runMenu = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
  await user.click(screen.getByRole('menuitem', { name }));
};

beforeEach(() => {
  toast.mockClear();
  savePhotos.mockReset();
  deletePhotos.mockReset();
  savePhotos.mockImplementation((ids) => Promise.resolve({ savedIds: ids, failedIds: [] }));
  deletePhotos.mockResolvedValue({ removedCount: 0 });
});

describe('저장', () => {
  it('확인 없이 고른 순서대로 저장하고 끝나면 완료 토스트와 함께 선택 모드를 끝낸다', async () => {
    const user = userEvent.setup();
    renderScreen(ready(dataWith(bulk(3))));
    await startSelecting(user, 3);
    const order = photoButtons().map(
      (button) => button.getAttribute('aria-label') ?? button.textContent,
    );
    expect(order.length).toBe(3);

    await runMenu(user, '저장');

    expect(savePhotos).toHaveBeenCalledTimes(1);
    expect(savePhotos.mock.calls[0]?.[0]).toEqual(['bulk-0', 'bulk-1', 'bulk-2']);
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.saveDone, {
        fullWidth: true,
        bottomOffset: TOAST_ABOVE_TAB_BAR_OFFSET,
      }),
    );
    expect(screen.getByRole('button', { name: '선택' })).toBeTruthy();
  });

  it('저장하는 동안 안내를 읽어 주고 「⋯」를 끄며 사진을 더 고를 수 없다', async () => {
    const user = userEvent.setup();
    let finish!: (_result: SaveResult) => void;
    savePhotos.mockReturnValue(new Promise<SaveResult>((resolve) => (finish = resolve)));
    renderScreen(ready(dataWith(bulk(3))));
    await startSelecting(user, 2);

    await runMenu(user, '저장');

    expect(screen.getByRole('status').textContent).toBe(PHOTO_BOX_MESSAGES.saving);
    expect(screen.getByRole('button', { name: '메뉴 열기' }).hasAttribute('disabled')).toBe(true);
    await user.click(photoButtons()[2]!);
    expect(photoButtons()[2]!.getAttribute('aria-pressed')).toBe('false');

    finish({ savedIds: ['bulk-0', 'bulk-1'], failedIds: [] });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('일부만 저장하면 저장된 사진은 선택에서 빼고 실패한 사진만 남긴다', async () => {
    const user = userEvent.setup();
    savePhotos.mockResolvedValue({ savedIds: ['bulk-0'], failedIds: ['bulk-1', 'bulk-2'] });
    renderScreen(ready(dataWith(bulk(3))));
    await startSelecting(user, 3);

    await runMenu(user, '저장');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.saveFailedSome(2), { fullWidth: true }),
    );
    expect(screen.getByRole('button', { name: '취소' })).toBeTruthy();
    expect(photoButtons()[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(photoButtons()[1]!.textContent).toContain('1번째 선택');
    expect(photoButtons()[2]!.textContent).toContain('2번째 선택');
  });

  it('전부 저장하지 못하면 오류 토스트를 띄우고 선택을 그대로 둔다', async () => {
    const user = userEvent.setup();
    savePhotos.mockResolvedValue({ savedIds: [], failedIds: ['bulk-0', 'bulk-1'] });
    renderScreen(ready(dataWith(bulk(3))));
    await startSelecting(user, 2);

    await runMenu(user, '저장');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.saveFailedAll, { fullWidth: true }),
    );
    expect(screen.getByRole('radio', { name: '전체 (2)' })).toBeTruthy();
  });

  it('저장 요청이 예외로 끝나도 전부 실패로 다룬다', async () => {
    const user = userEvent.setup();
    savePhotos.mockRejectedValue(new Error('network'));
    renderScreen(ready(dataWith(bulk(3))));
    await startSelecting(user, 2);

    await runMenu(user, '저장');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.saveFailedAll, { fullWidth: true }),
    );
    expect(screen.getByRole('radio', { name: '전체 (2)' })).toBeTruthy();
  });
});

describe('번들 만들기', () => {
  it('1~20장이면 확인 창을 띄우고 「예」를 누르면 고른 순서를 넘긴다', async () => {
    const user = userEvent.setup();
    const onCreateBundle = vi.fn();
    renderScreen(ready(dataWith(bulk(3))), { onCreateBundle });
    await startSelecting(user, 2);

    await runMenu(user, '번들 만들기');
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(PHOTO_BOX_MESSAGES.bundleConfirmTitle)).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: '예' }));

    expect(onCreateBundle).toHaveBeenCalledWith(['bulk-0', 'bulk-1']);
  });

  it('「아니요」를 누르면 아무것도 하지 않고 선택이 남는다', async () => {
    const user = userEvent.setup();
    const onCreateBundle = vi.fn();
    renderScreen(ready(dataWith(bulk(3))), { onCreateBundle });
    await startSelecting(user, 2);
    await runMenu(user, '번들 만들기');

    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: '아니요' }),
    );

    expect(onCreateBundle).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('radio', { name: '전체 (2)' })).toBeTruthy();
  });

  it('21장 이상이면 확인 창 없이 안내 토스트를 띄우고 선택을 유지한다', async () => {
    const user = userEvent.setup();
    renderScreen(ready(dataWith(bulk(MAX_BUNDLE_PHOTOS + 1))));
    await startSelecting(user, MAX_BUNDLE_PHOTOS + 1);

    await runMenu(user, '번들 만들기');

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.bundleTooMany, { fullWidth: true });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('radio', { name: `전체 (${MAX_BUNDLE_PHOTOS + 1})` })).toBeTruthy();
  });
});

describe('삭제', () => {
  it('확인 창에서 「취소」를 누르면 지우지 않는다', async () => {
    const user = userEvent.setup();
    renderScreen(ready(dataWith(bulk(3))));
    await startSelecting(user, 2);

    await runMenu(user, '삭제');
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('선택한 사진 2장을 삭제할까요?')).toBeTruthy();
    expect(within(dialog).getByText('삭제 이후에는 복구할 수 없어요.')).toBeTruthy();
    // 되돌릴 수 없는 동작이라 처음 포커스는 「취소」
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: '취소' }));

    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(deletePhotos).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: '전체 (2)' })).toBeTruthy();
  });

  it('「삭제하기」를 누르면 지우고 사라진 장수를 알린 뒤 선택 모드를 끝낸다', async () => {
    const user = userEvent.setup();
    deletePhotos.mockResolvedValue({ removedCount: 2 });
    renderScreen(ready(dataWith(bulk(3))));
    await startSelecting(user, 2);
    await runMenu(user, '삭제');

    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: '삭제하기' }),
    );

    expect(deletePhotos).toHaveBeenCalledWith(['bulk-0', 'bulk-1']);
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deleteDone(2), {
        fullWidth: true,
        bottomOffset: TOAST_ABOVE_TAB_BAR_OFFSET,
      }),
    );
    expect(screen.getByRole('button', { name: '선택' })).toBeTruthy();
  });

  it('사라진 사진이 0장이면 토스트를 띄우지 않는다', async () => {
    const user = userEvent.setup();
    deletePhotos.mockResolvedValue({ removedCount: 0 });
    renderScreen(ready(dataWith(bulk(3))));
    await startSelecting(user, 1);
    await runMenu(user, '삭제');

    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: '삭제하기' }),
    );

    await waitFor(() => expect(screen.getByRole('button', { name: '선택' })).toBeTruthy());
    expect(toast).not.toHaveBeenCalled();
  });

  it('일반 멤버가 다른 멤버 사진을 섞어 고르면 지우지 않고 안내한다', async () => {
    const user = userEvent.setup();
    const data = dataWith(bulk(3, ['gyeongjin']), { memberId: 'hyochan', isAdmin: false });
    renderScreen(ready(data));
    await startSelecting(user, 2);

    await runMenu(user, '삭제');

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deleteForbidden, { fullWidth: true });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(deletePhotos).not.toHaveBeenCalled();
  });

  it('일반 멤버도 내가 올린 사진은 확인 창으로 지울 수 있다', async () => {
    const user = userEvent.setup();
    const data = dataWith(bulk(3, ['hyochan']), { memberId: 'hyochan', isAdmin: false });
    renderScreen(ready(data));
    await startSelecting(user, 1);

    await runMenu(user, '삭제');

    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });
});

describe('선택 중 사진이 사라진 경우', () => {
  it('실행하지 않고 선택에서 뺀 뒤 안내하며 선택 모드는 유지한다', async () => {
    const user = userEvent.setup();
    const { rerender } = renderScreen(ready(dataWith(bulk(3))));
    await startSelecting(user, 3);

    // 다른 멤버가 지워서 목록이 새로 불러와졌다고 가정
    rerender(
      <PhotoBoxScreen
        state={ready(dataWith(bulk(3).filter((photo) => photo.id !== 'bulk-1')))}
        actions={actions}
        currentYear={2026}
      />,
    );
    await runMenu(user, '저장');

    expect(savePhotos).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.selectionStale(1), { fullWidth: true });
    expect(screen.getByRole('button', { name: '취소' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '전체 (2)' })).toBeTruthy();
    expect(photoButtons()[0]!.textContent).toContain('1번째 선택');
    expect(photoButtons()[1]!.textContent).toContain('2번째 선택');
  });
});
