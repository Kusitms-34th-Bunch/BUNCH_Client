import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { photoBoxFixture } from '@/features/photo-box/fixtures/photoBox.fixture';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { draftFixture } from '../../fixtures/draft.fixture';
import { DraftPhotoAdd } from './DraftPhotoAdd';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const creator: DraftViewer = { memberId: 'jiye', bunchRole: 'owner' };
const actions = { replacePhotos: vi.fn() };
const onBack = vi.fn();
const onApplied = vi.fn();

const renderAdd = (draft: Draft = draftFixture) =>
  render(
    <DraftPhotoAdd
      draft={draft}
      viewer={creator}
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

    const next = actions.replacePhotos.mock.calls[0]![0] as Draft['photos'];
    expect(next.map((photo) => photo.id)).toEqual([
      'draft-photo-1',
      'draft-photo-2',
      'draft-photo-3',
      'draft-photo-4',
    ]);
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photoAddApplied, { fullWidth: true });
    expect(onApplied).toHaveBeenCalledTimes(1);
  });

  it('고른 사진을 풀면 빠지는 장수를 확인하고, 「취소」면 적용하지 않는다', async () => {
    renderAdd();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(applyButton());

    expect(await screen.findByText('사진 1장이 번들에서 빠져요')).toBeInTheDocument();
    expect(screen.getByText('빠진 사진의 캡션도 함께 지워져요.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(actions.replacePhotos).not.toHaveBeenCalled();
  });

  it('빠지는 사진을 확인에서 「적용하기」하면 그 사진을 빼고 적용한다', async () => {
    renderAdd();

    await userEvent.click(sectionPhotos()[0]!);
    await userEvent.click(applyButton());
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '적용하기' }));

    const next = actions.replacePhotos.mock.calls[0]![0] as Draft['photos'];
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

    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.maxPhotos, { fullWidth: true });
    expect(applyButton()).toBeDisabled();
  });

  it('사진을 모두 풀면 「적용하기」가 꺼져 번들이 비지 않는다', async () => {
    renderAdd();

    for (const cell of sectionPhotos().slice(0, 3)) await userEvent.click(cell);

    expect(screen.getByRole('status')).toHaveTextContent('선택한 사진이 없어요.');
    expect(applyButton()).toBeDisabled();
  });

  it('다른 멤버가 편집 중인 사진은 풀 수 없다', async () => {
    renderAdd({ ...draftFixture, editing: { photoEditors: { 'draft-photo-1': ['gyeongjin'] } } });

    await userEvent.click(sectionPhotos()[0]!);

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, { fullWidth: true });
    await waitFor(() => expect(applyButton()).toBeDisabled());
  });
});
