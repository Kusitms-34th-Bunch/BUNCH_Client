import type * as DesignSystem from '@app/design-system';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftVisibility } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { DraftVisibilityScreen } from './DraftVisibilityScreen';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const onChange = vi.fn();
const onBack = vi.fn();
const onUpload = vi.fn();

type Options = {
  value?: DraftVisibility | null;
  bunchPrivate?: boolean;
  uploading?: boolean;
};

const renderScreen = ({ value = null, bunchPrivate = false, uploading = false }: Options = {}) =>
  render(
    <DraftVisibilityScreen
      value={value}
      bunchPrivate={bunchPrivate}
      uploading={uploading}
      onChange={onChange}
      onBack={onBack}
      onUpload={onUpload}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DraftVisibilityScreen', () => {
  it('제목과 「전체 공개」·「멤버 공개」 카드, 안내 문구를 보인다', () => {
    renderScreen();

    expect(
      screen.getByRole('heading', { name: '번들의 공개 범위를 설정해 주세요' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '전체 공개' })).toHaveAccessibleDescription(
      '번치의 모든 사용자가 볼 수 있어요',
    );
    expect(screen.getByRole('radio', { name: '멤버 공개' })).toHaveAccessibleDescription(
      '우리 번치 멤버만 볼 수 있어요',
    );
    expect(
      screen.getByText('* 업로드 이후에는 관리자만 수정하거나 삭제할 수 있어요.'),
    ).toBeInTheDocument();
  });

  it('비공개 번치면 「전체 공개」 대신 팔로워도 볼 수 있는 「일부 공개」를 보인다', () => {
    renderScreen({ bunchPrivate: true });

    expect(screen.getByRole('radio', { name: '일부 공개' })).toHaveAccessibleDescription(
      '우리 번치의 팔로워도 볼 수 있어요',
    );
    expect(screen.queryByRole('radio', { name: '전체 공개' })).toBeNull();
  });

  it('공개 범위를 고르기 전에는 「업로드」가 흐리고 누르면 선택을 안내하며, 고르면 onChange를 부른다', async () => {
    renderScreen();

    const upload = screen.getByRole('button', { name: '업로드' });
    expect(upload).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(upload);
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.visibilityRequired, {
      fullWidth: true,
      bottomOffset: 66,
    });
    expect(onUpload).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('radio', { name: '멤버 공개' }));
    expect(onChange).toHaveBeenCalledWith('members');
    await userEvent.click(screen.getByRole('radio', { name: '전체 공개' }));
    expect(onChange).toHaveBeenCalledWith('public');
  });

  it('공개 범위를 골랐으면 「업로드」가 켜지고 누르면 onUpload를 부른다', async () => {
    renderScreen({ value: 'public' });

    expect(screen.getByRole('radio', { name: '전체 공개' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: '업로드' }));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('업로드하는 동안은 「업로드 중」으로 바뀌고 로딩으로 화면을 막는다', () => {
    const { container } = renderScreen({ value: 'members', uploading: true });

    expect(screen.getByRole('button', { name: '업로드 중' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('status')).toHaveTextContent('업로드 중');
    // 화면 전체를 덮는 dim 로딩(PageLoading)
    expect(container.ownerDocument.querySelector('.bg-overlay-dim-subtle')).not.toBeNull();
    expect(screen.getByRole('radiogroup', { hidden: true }).closest('[inert]')).not.toBeNull();
  });

  it('뒤로 가기를 누르면 onBack을 부른다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
