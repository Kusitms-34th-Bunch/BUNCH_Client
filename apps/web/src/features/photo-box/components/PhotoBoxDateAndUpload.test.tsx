import type * as DesignSystem from '@app/design-system';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhotoBoxActions, PhotoBoxData, PhotoBoxPhoto, PhotoBoxViewer } from '../lib/types';
import { TOAST_ABOVE_TAB_BAR_OFFSET } from '../constants/layout';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { photoBoxFixture } from '../fixtures/photoBox.fixture';
import { MAX_PHOTOS_IN_BOX } from '../lib/photoActions';
import { PhotoBoxScreen } from './PhotoBoxScreen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const changePhotoDates = vi.fn<PhotoBoxActions['changePhotoDates']>();
const actions: PhotoBoxActions = {
  savePhotos: (ids) => Promise.resolve({ savedIds: ids, failedIds: [] }),
  deletePhotos: () => Promise.resolve({ removedCount: 0 }),
  changePhotoDates,
};

const photo = (id: string, uploaderIds: string[]): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  takenAt: '2026-09-27T10:00',
  uploadedAt: '2026-10-01T00:00:00',
  uploaderIds,
  status: 'ready',
});

const admin: PhotoBoxViewer = { memberId: 'eunwoo', isAdmin: true };
const member: PhotoBoxViewer = { memberId: 'eunwoo', isAdmin: false };

const dataWith = (photos: PhotoBoxPhoto[], viewer: PhotoBoxViewer = admin): PhotoBoxData => ({
  ...photoBoxFixture,
  viewer,
  photos,
});

const renderScreen = (
  data: PhotoBoxData,
  props: Partial<React.ComponentProps<typeof PhotoBoxScreen>> = {},
) =>
  render(
    <PhotoBoxScreen
      state={{ kind: 'ready', data }}
      actions={actions}
      currentYear={2026}
      {...props}
    />,
  );

const photoButtons = () =>
  screen.queryAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'));

const startSelecting = async (user: ReturnType<typeof userEvent.setup>, count: number) => {
  await user.click(screen.getByRole('button', { name: '선택' }));
  for (const button of photoButtons().slice(0, count)) fireEvent.click(button);
};

const openDateSheet = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
  await user.click(screen.getByRole('menuitem', { name: '날짜 바꾸기' }));
};

const pickAndSave = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByRole('dialog', { name: '날짜 바꾸기' });
  await user.click(screen.getByRole('button', { name: '2026년 10월 5일' }));
  await user.click(screen.getByRole('button', { name: '저장' }));
};

beforeEach(() => {
  toast.mockClear();
  changePhotoDates.mockReset();
  changePhotoDates.mockResolvedValue(undefined);
});

describe('선택 모드 날짜 바꾸기', () => {
  // 달력은 오늘 이후를 막으므로 오늘을 고정
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 17, 12));
  });
  afterEach(() => vi.useRealTimers());

  const own = [photo('a', ['eunwoo']), photo('b', ['eunwoo']), photo('c', ['eunwoo'])];

  it('고른 사진 전부의 날짜를 한 번에 바꾸고 선택 모드를 끝내며 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    renderScreen(dataWith(own));
    await startSelecting(user, 2);
    await openDateSheet(user);

    // 처음에는 오늘이 속한 달을 아무것도 고르지 않은 채 열고 저장이 막혀 있음
    expect(await screen.findByRole('grid', { name: '2026년 10월' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '저장' }).getAttribute('aria-disabled')).toBe('true');

    await user.click(screen.getByRole('button', { name: '2026년 10월 5일' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(changePhotoDates).toHaveBeenCalledTimes(1));
    const [ids, date] = changePhotoDates.mock.calls[0] as [string[], Date];
    expect(ids).toEqual(['a', 'b']);
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 5]);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '날짜 바꾸기' })).toBeNull());
    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.dateChanged, {
      fullWidth: true,
      bottomOffset: TOAST_ABOVE_TAB_BAR_OFFSET,
    });
    expect(screen.getByRole('button', { name: '선택' })).toBeTruthy();
  });

  it('저장하지 못하면 오류 토스트를 띄우고 시트와 선택을 그대로 둔다', async () => {
    const user = userEvent.setup();
    changePhotoDates.mockRejectedValue(new Error('network'));
    renderScreen(dataWith(own));
    await startSelecting(user, 2);
    await openDateSheet(user);
    await pickAndSave(user);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.dateChangeFailed, { fullWidth: true }),
    );
    expect(screen.getByRole('dialog', { name: '날짜 바꾸기' })).toBeTruthy();
    // 선택 모드가 이어지고 있음(시트가 뒤를 가려 접근성 트리에서는 숨겨짐)
    expect(screen.queryByRole('button', { name: '선택', hidden: true })).toBeNull();
  });

  it('일반 멤버가 다른 멤버 사진을 섞으면 시트를 열지 않고 안내한다', async () => {
    const user = userEvent.setup();
    renderScreen(dataWith([photo('a', ['eunwoo']), photo('b', ['gyeongjin'])], member));
    await startSelecting(user, 2);
    await openDateSheet(user);

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.dateForbidden, { fullWidth: true });
    expect(screen.queryByRole('dialog', { name: '날짜 바꾸기' })).toBeNull();
    expect(changePhotoDates).not.toHaveBeenCalled();
  });

  it('관리자가 다른 멤버 사진을 포함해 저장하면 확인 뒤에 바꾼다', async () => {
    const user = userEvent.setup();
    renderScreen(dataWith([photo('a', ['eunwoo']), photo('b', ['gyeongjin'])]));
    await startSelecting(user, 2);
    await openDateSheet(user);
    await pickAndSave(user);

    expect(
      await screen.findByRole('alertdialog', { name: PHOTO_BOX_MESSAGES.dateConfirmTitle }),
    ).toBeTruthy();
    expect(changePhotoDates).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '바꾸기' }));

    await waitFor(() => expect(changePhotoDates).toHaveBeenCalledTimes(1));
  });

  it('확인 창에서 취소하면 바꾸지 않고 시트를 유지한다', async () => {
    const user = userEvent.setup();
    renderScreen(dataWith([photo('a', ['eunwoo']), photo('b', ['eunwoo', 'gyeongjin'])]));
    await startSelecting(user, 2);
    await openDateSheet(user);
    await pickAndSave(user);
    await screen.findByRole('alertdialog', { name: PHOTO_BOX_MESSAGES.dateConfirmTitle });

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(changePhotoDates).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.queryByRole('alertdialog', { name: PHOTO_BOX_MESSAGES.dateConfirmTitle }),
      ).toBeNull(),
    );
    expect(screen.getByRole('dialog', { name: '날짜 바꾸기' })).toBeTruthy();
  });
});

describe('사진 올리기 시트', () => {
  it('「+」를 누르면 번치 이름이 든 시트가 열리고 방식을 고르면 닫고 알린다', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    renderScreen(dataWith([photo('a', ['eunwoo'])]), { onUpload });

    await user.click(screen.getByRole('button', { name: '사진 올리기' }));
    expect(
      await screen.findByRole('dialog', {
        name: PHOTO_BOX_MESSAGES.uploadSheetTitle(photoBoxFixture.bunch.name),
      }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /앨범에서 선택/ }));

    expect(onUpload).toHaveBeenCalledWith('album');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('카메라로 찍기를 고르면 camera로 알린다', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    renderScreen(dataWith([photo('a', ['eunwoo'])]), { onUpload });

    await user.click(screen.getByRole('button', { name: '사진 올리기' }));
    await user.click(await screen.findByRole('button', { name: /카메라로 찍기/ }));

    expect(onUpload).toHaveBeenCalledWith('camera');
  });

  it('사진함이 가득 차면 시트를 열지 않고 토스트로 알린다', async () => {
    const user = userEvent.setup();
    const full = Array.from({ length: MAX_PHOTOS_IN_BOX }, (_, i) => photo(`p${i}`, ['eunwoo']));
    renderScreen(dataWith(full));

    await user.click(screen.getByRole('button', { name: '사진 올리기' }));

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.photoBoxFull, { fullWidth: true });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
