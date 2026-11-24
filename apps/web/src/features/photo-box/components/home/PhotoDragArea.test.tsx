import type * as DesignSystem from '@app/design-system';
import type * as DndKit from '@dnd-kit/core';
import type { ComponentProps } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhotoSection } from '../../lib/photoDate';
import type { PhotoBoxActions, PhotoBoxPhoto, PhotoBoxViewer } from '../../lib/types';
import { dateConfirmCopy, PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { ActionsContext } from '../../contexts/photoSelection';
import { PHOTO_ID_ATTRIBUTE } from '../../lib/dragSelect';
import { MissingPhotosError } from '../../lib/missingPhotos';
import { PhotoDragArea } from './PhotoDragArea';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 실제 포인터 끌기 대신 DndContext가 받은 핸들러를 직접 불러 놓기 흐름만 확인
type DndProps = ComponentProps<typeof DndKit.DndContext>;
const dnd = vi.hoisted((): { props: unknown } => ({ props: undefined }));
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof DndKit>();
  return {
    ...actual,
    DndContext: (props: DndProps) => {
      dnd.props = props;
      return <actual.DndContext {...props} />;
    },
  };
});
const dndProps = () => dnd.props as DndProps;

const changePhotoDates = vi.fn<PhotoBoxActions['changePhotoDates']>();
const actions: PhotoBoxActions = {
  savePhotos: (ids) => Promise.resolve({ savedIds: ids, failedIds: [] }),
  deletePhotos: () => Promise.resolve({ removedCount: 0 }),
  changePhotoDates,
};
const onToggle = vi.fn<(_photoId: string) => void>();

const photo = (id: string, takenAt: string | null, uploaderIds = ['eunwoo']): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  takenAt,
  uploadedAt: '2026-10-01T00:00:00',
  uploaderIds,
  usedInDraftBundle: false,
  status: 'ready',
});

const section = (dateKey: string, label: string, photos: PhotoBoxPhoto[]): PhotoSection => ({
  dateKey,
  label,
  photos,
});

const member: PhotoBoxViewer = { memberId: 'eunwoo', isAdmin: false };
const admin: PhotoBoxViewer = { memberId: 'eunwoo', isAdmin: true };

const sections = (photos: { a?: PhotoBoxPhoto[]; b?: PhotoBoxPhoto[] } = {}) => [
  section('2026-09-27', '9월 27일', photos.a ?? [photo('a1', '2026-09-27T10:00')]),
  section('2026-10-05', '10월 5일', photos.b ?? [photo('b1', '2026-10-05T10:00')]),
];

const renderArea = (props: Partial<ComponentProps<typeof PhotoDragArea>> = {}) =>
  render(
    <ActionsContext value={{ active: true, onToggle }}>
      <PhotoDragArea
        sections={sections()}
        undated={[]}
        viewer={member}
        actions={actions}
        enabled
        {...props}
      />
    </ActionsContext>,
  );

// 확인 창이 열리면 뒤 목록이 접근성 트리에서 숨으므로 숨은 목록도 찾음
const idsIn = (label: string) =>
  [
    ...screen
      .getByRole('list', { name: label, hidden: true })
      .querySelectorAll(`[${PHOTO_ID_ATTRIBUTE}]`),
  ].map((cell) => cell.getAttribute(PHOTO_ID_ATTRIBUTE));

const event = (photoId: string, overId?: string, delta = { x: 0, y: 40 }) =>
  ({
    active: { id: photoId },
    over: overId === undefined ? null : { id: overId },
    delta,
  }) as unknown as DndKit.DragEndEvent;

// 길게 눌러 끌기 시작 → 다른 섹션 위로 지나감 → 놓음
const drag = (photoId: string, overId: string) => {
  act(() => dndProps().onDragStart?.(event(photoId)));
  act(() => dndProps().onDragOver?.(event(photoId, overId)));
  act(() => dndProps().onDragEnd?.(event(photoId, overId)));
};

const undoAction = () => {
  const options = toast.mock.calls.find(([message]) => message === PHOTO_BOX_MESSAGES.dateChanged);
  const action = options?.[1]?.action;
  if (!action || !('onClick' in action)) throw new Error('되돌리기 버튼 없음');
  return action.onClick;
};

beforeEach(() => {
  toast.mockClear();
  onToggle.mockClear();
  changePhotoDates.mockReset();
  changePhotoDates.mockResolvedValue(undefined);
});

describe('PhotoDragArea 놓기', () => {
  it('다른 날짜 섹션에 놓으면 그 날짜로 바꾸고 되돌리기 토스트를 띄운다', async () => {
    const onMovingChange = vi.fn<(_moving: boolean) => void>();
    renderArea({ onMovingChange });

    drag('a1', '2026-10-05');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.dateChanged, expect.anything()),
    );
    expect(changePhotoDates).toHaveBeenCalledWith(['a1'], new Date(2026, 9, 5));
    expect(onMovingChange.mock.calls).toEqual([[true], [false]]);
  });

  it('요청이 도는 동안 놓은 자리를 유지하고 끌 수 없으며, 끝나면 원래 목록으로 돌아간다', async () => {
    let resolve = () => {};
    changePhotoDates.mockReturnValue(new Promise<void>((done) => (resolve = done)));
    const { container } = renderArea();

    drag('a1', '2026-10-05');

    expect(idsIn('10월 5일')).toEqual(['b1', 'a1']);
    expect(container.querySelectorAll('[data-photo-draggable]')).toHaveLength(0);

    await act(() => {
      resolve();
      return Promise.resolve();
    });

    expect(idsIn('10월 5일')).toEqual(['b1']);
    expect(idsIn('9월 27일')).toEqual(['a1']);
    expect(container.querySelectorAll('[data-photo-draggable]')).toHaveLength(2);
  });

  it('되돌리기를 누르면 원래 섹션 날짜로 다시 바꾼다', async () => {
    renderArea();
    drag('a1', '2026-10-05');
    await waitFor(() => expect(changePhotoDates).toHaveBeenCalledTimes(1));

    await waitFor(() => undoAction());
    undoAction()();

    expect(changePhotoDates).toHaveBeenLastCalledWith(['a1'], new Date(2026, 8, 27));
  });

  it('날짜 미확인 사진을 옮긴 것을 되돌리면 날짜 없음으로 되돌린다', async () => {
    renderArea({ undated: [photo('u1', null)] });
    drag('u1', '2026-10-05');
    await waitFor(() => undoAction());

    undoAction()();

    expect(changePhotoDates).toHaveBeenLastCalledWith(['u1'], null);
  });

  it('되돌리기가 실패하면 사라진 사진과 일반 실패를 나눠 알린다', async () => {
    renderArea();
    drag('a1', '2026-10-05');
    await waitFor(() => undoAction());

    changePhotoDates.mockRejectedValueOnce(new MissingPhotosError(['a1']));
    await act(() => {
      undoAction()();
      return Promise.resolve();
    });
    expect(toast).toHaveBeenLastCalledWith(PHOTO_BOX_MESSAGES.deletedPhoto);

    changePhotoDates.mockRejectedValueOnce(new Error('network'));
    await act(() => {
      undoAction()();
      return Promise.resolve();
    });
    expect(toast).toHaveBeenLastCalledWith(PHOTO_BOX_MESSAGES.dateChangeFailed);
  });

  it('바꾸지 못하면 원래 자리로 돌리고 오류 토스트를 띄운다', async () => {
    changePhotoDates.mockRejectedValue(new Error('network'));
    renderArea();

    drag('a1', '2026-10-05');

    await waitFor(() => expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.dateChangeFailed));
    expect(idsIn('9월 27일')).toEqual(['a1']);
    expect(idsIn('10월 5일')).toEqual(['b1']);
  });

  it('원래 섹션이나 섹션 밖에 놓으면 아무것도 바꾸지 않는다', () => {
    renderArea();

    drag('a1', '2026-09-27');
    act(() => dndProps().onDragStart?.(event('a1')));
    act(() => dndProps().onDragEnd?.(event('a1')));

    expect(changePhotoDates).not.toHaveBeenCalled();
    expect(idsIn('9월 27일')).toEqual(['a1']);
  });

  it('날짜 미확인 영역 위로 지나가면 처음 자리로 돌린다', () => {
    renderArea({ undated: [photo('u1', null)] });

    act(() => dndProps().onDragStart?.(event('a1')));
    act(() => dndProps().onDragOver?.(event('a1', '2026-10-05')));
    expect(idsIn('10월 5일')).toEqual(['b1', 'a1']);
    act(() => dndProps().onDragOver?.(event('a1', 'undated')));

    expect(idsIn('9월 27일')).toEqual(['a1']);
  });

  it('거의 움직이지 않고 놓으면 선택·해제로 이어 준다', () => {
    renderArea();

    act(() => dndProps().onDragStart?.(event('a1')));
    act(() => dndProps().onDragEnd?.(event('a1', '2026-09-27', { x: 1, y: 1 })));

    expect(onToggle).toHaveBeenCalledWith('a1');
    expect(changePhotoDates).not.toHaveBeenCalled();
  });

  it('관리자가 다른 멤버 사진을 놓으면 확인 뒤에 바꾸고, 취소하면 원래 자리로 돌린다', async () => {
    const user = userEvent.setup();
    const others = { a: [photo('a1', '2026-09-27T10:00', ['gyeongjin'])] };
    renderArea({ viewer: admin, sections: sections(others) });

    drag('a1', '2026-10-05');
    await screen.findByRole('alertdialog', { name: dateConfirmCopy('others').title });
    expect(idsIn('10월 5일')).toEqual(['b1', 'a1']);
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(changePhotoDates).not.toHaveBeenCalled();
    expect(idsIn('9월 27일')).toEqual(['a1']);

    drag('a1', '2026-10-05');
    await screen.findByRole('alertdialog', { name: dateConfirmCopy('others').title });
    await user.click(screen.getByRole('button', { name: '변경하기' }));

    await waitFor(() =>
      expect(changePhotoDates).toHaveBeenCalledWith(['a1'], new Date(2026, 9, 5)),
    );
  });

  it('끌기 취소는 원래 자리로 돌리고 시작·취소만 낭독한다', () => {
    renderArea();
    const { announcements } = dndProps().accessibility ?? {};

    act(() => dndProps().onDragStart?.(event('a1')));
    act(() => dndProps().onDragOver?.(event('a1', '2026-10-05')));
    act(() => dndProps().onDragCancel?.(event('a1')));

    expect(idsIn('9월 27일')).toEqual(['a1']);
    expect(announcements?.onDragStart(event('a1'))).toBe(PHOTO_BOX_MESSAGES.dragStart);
    expect(announcements?.onDragOver(event('a1', '2026-10-05'))).toBeUndefined();
    expect(announcements?.onDragEnd(event('a1', '2026-10-05'))).toBeUndefined();
    expect(announcements?.onDragCancel(event('a1'))).toBe(PHOTO_BOX_MESSAGES.dragCancel);
  });

  it('끌 수 없게 되면 끌던 상태를 걷는다', () => {
    const { rerender } = renderArea();
    act(() => dndProps().onDragStart?.(event('a1')));
    act(() => dndProps().onDragOver?.(event('a1', '2026-10-05')));

    rerender(
      <ActionsContext value={{ active: true, onToggle }}>
        <PhotoDragArea
          sections={sections()}
          undated={[]}
          viewer={member}
          actions={actions}
          enabled={false}
        />
      </ActionsContext>,
    );

    expect(idsIn('9월 27일')).toEqual(['a1']);
  });
});
