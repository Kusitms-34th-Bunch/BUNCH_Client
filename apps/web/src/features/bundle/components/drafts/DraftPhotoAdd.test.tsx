import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { photoBoxFixture } from '@/features/photo-box/fixtures/photoBox.fixture';
import type { Draft, DraftPhoto } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { draftFixture } from '../../fixtures/draft.fixture';
import { DraftPhotoAdd } from './DraftPhotoAdd';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/navigation/toastAfterNavigation', () => ({ toastAfterNavigation }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const actions = {
  replacePhotos: vi.fn<(_photos: readonly DraftPhoto[]) => boolean>(() => true),
  presence: { type: vi.fn(), blur: vi.fn(), begin: vi.fn(), end: vi.fn() },
};
const onBack = vi.fn();
const onApplied = vi.fn();

const renderAdd = (draft: Draft = draftFixture) =>
  render(
    <DraftPhotoAdd
      draft={draft}
      data={photoBoxFixture}
      actions={actions}
      currentYear={2026}
      onBack={onBack}
      onApplied={onApplied}
    />,
  );

const applyButton = () => screen.getByRole('button', { name: '적용하기' });
// 9월 27일 섹션 사진: 처음 3장은 번들에 담긴 사진 1·2·3
const sectionPhotos = () =>
  within(screen.getByRole('region', { name: '9월 27일 일요일' })).getAllByRole('button');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DraftPhotoAdd', () => {
  it('번들에 담긴 사진이 선택된 채 열리고 「적용하기」는 꺼져 있다', () => {
    renderAdd();

    expect(screen.getByRole('heading', { level: 1, name: '사진 추가' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('3장 선택됨');
    expect(applyButton()).toBeDisabled();
  });

  it('새 사진을 고르면 「적용하기」가 켜지고 누르면 맨 뒤에 붙여 적용한다', async () => {
    renderAdd();

    await userEvent.click(sectionPhotos()[3]!);
    expect(applyButton()).toBeEnabled();
    await userEvent.click(applyButton());

    const next = actions.replacePhotos.mock.calls[0]![0];
    expect(next.map((photo) => photo.id)).toEqual([
      'draft-photo-1',
      'draft-photo-2',
      'draft-photo-3',
      'draft-photo-4',
    ]);
    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_MESSAGES.photoAddApplied);
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it('연결이 끊겨 적용이 막히면 성공 안내와 화면 이동을 하지 않는다', async () => {
    actions.replacePhotos.mockReturnValueOnce(false);
    renderAdd();

    await userEvent.click(sectionPhotos()[3]!);
    await userEvent.click(applyButton());

    expect(actions.replacePhotos).toHaveBeenCalledTimes(1);
    expect(toastAfterNavigation).not.toHaveBeenCalled();
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('고른 사진을 풀면 빠지는 장수를 확인하고, 「취소」면 적용하지 않는다', async () => {
    renderAdd();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(applyButton());

    expect(await screen.findByText('사진 1장이 번들에서 빠져요')).toBeInTheDocument();
    expect(screen.getByText('빠진 사진의 픽도 함께 사라져요.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(actions.replacePhotos).not.toHaveBeenCalled();
  });

  it('빠지는 사진을 확인에서 「적용하기」하면 그 사진을 빼고 적용한다', async () => {
    renderAdd();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(applyButton());
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '적용하기' }));

    const next = actions.replacePhotos.mock.calls[0]![0];
    expect(next.map((photo) => photo.id)).toEqual(['draft-photo-2', 'draft-photo-3']);
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it('변경이 없으면 뒤로 가기가 바로 나간다', async () => {
    renderAdd();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('변경이 있으면 나가기 확인을 하고 「취소」는 머물고 「나가기」는 적용 없이 나간다', async () => {
    renderAdd();

    await userEvent.click(sectionPhotos()[3]!);
    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(await screen.findByText('저장하지 않고 나갈까요?')).toBeInTheDocument();
    expect(screen.getByText('변경한 내용이 반영되지 않아요.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onBack).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    await userEvent.click(await screen.findByRole('button', { name: '나가기' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(actions.replacePhotos).not.toHaveBeenCalled();
  });

  it('20장을 넘겨 고르려 하면 안내하고 더 고르지 않는다', async () => {
    const photos = Array.from({ length: 20 }, (_, index) => ({
      ...draftFixture.photos[0]!,
      id: `gallery-${index}`,
      sourcePhotoId: undefined,
    }));
    renderAdd({ ...draftFixture, photos });

    await userEvent.click(sectionPhotos()[0]!);

    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.maxPhotos);
    expect(applyButton()).toBeDisabled();
  });

  it('사진을 모두 풀면 「적용하기」가 꺼져 번들이 비지 않는다', async () => {
    renderAdd();

    for (const cell of sectionPhotos().slice(0, 3)) await userEvent.click(cell);

    expect(screen.getByRole('status')).toHaveTextContent('선택한 사진이 없어요.');
    expect(applyButton()).toBeDisabled();
  });

  it('다른 멤버가 사진 작업 중이어도 사진을 풀 수 있고, 이 화면에 있는 동안 사진 작업을 알린다', async () => {
    renderAdd({ ...draftFixture, editing: { photoMemberIds: ['gyeongjin'] } });
    expect(actions.presence.begin).toHaveBeenCalledWith('PHOTOS');
    const selectedBefore = screen.getByRole('status').textContent;

    await userEvent.click(sectionPhotos()[0]!);

    expect(toast).not.toHaveBeenCalled();
    // 클릭이 무시되지 않고 선택이 실제로 풀려 선택 개수 표시가 바뀜
    expect(screen.getByRole('status').textContent).not.toBe(selectedBefore);
  });
});
