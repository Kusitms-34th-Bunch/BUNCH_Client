import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROFILE_IMAGE_RULES } from '../../lib/imageFile';
import { ProfilePhotoField } from './ProfilePhotoField';

vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));
vi.mock('../loading/LoadingRipple', () => ({ LoadingRipple: () => null }));

type PickerOptions = {
  onError?: (_error: Error) => void;
  onSelect?: (_url: string) => void;
  rules?: unknown;
  nativeEdit?: boolean;
};
const picker = vi.hoisted(() => {
  const options: PickerOptions = {};
  return {
    options,
    isPending: false,
    inputRef: { current: null },
    handleCameraClick: vi.fn(),
    handleFileChange: vi.fn(),
  };
});
vi.mock('../../hooks/usePhotoPicker', () => ({
  usePhotoPicker: (options: PickerOptions) => {
    picker.options = options;
    return picker;
  },
}));

const PHOTO = 'data:image/jpeg;base64,AAAA';

const openDialog = async () => {
  await userEvent.click(screen.getByRole('button', { name: '프로필 사진 변경' }));
  return screen.findByRole('alertdialog', { name: '프로필 사진 설정' });
};

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  picker.isPending = false;
  // jsdom은 레이아웃이 없어 사진 조정 영역 크기를 지정(크기를 모르면 조정 화면이 완료를 막음)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(375);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
});

describe('ProfilePhotoField', () => {
  it('프로필 사진 규칙으로, 앱에서도 시스템 편집 없이 사진을 고른다', () => {
    render(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);

    expect(picker.options.rules).toBe(PROFILE_IMAGE_RULES);
    expect(picker.options.nativeEdit).toBe(false);
    expect(document.querySelector('input[type="file"]')?.getAttribute('accept')).toBe(
      'image/jpeg,image/png,image/heic,image/heif,image/webp',
    );
  });

  it('기본 이미지면 기본 이미지 선택지 없이 앨범 선택만 보인다', async () => {
    render(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);

    const dialog = await openDialog();

    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['앨범에서 사진 선택하기', '취소']);
  });

  it('직접 고른 사진이면 「기본 이미지 적용하기」로 기본 이미지로 되돌린다', async () => {
    const onChange = vi.fn();
    render(<ProfilePhotoField value={PHOTO} onChange={onChange} />);

    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: '기본 이미지 적용하기' }));

    expect(onChange).toHaveBeenCalledWith(undefined);
    // 미리보기만 바뀌어 결과를 읽어 줌
    expect(screen.getByText('기본 이미지로 바꿨어요')).toBeTruthy();
  });

  it('「앨범에서 사진 선택하기」는 사진 선택을 시작하고, 고른 사진은 조정 화면으로 연다', async () => {
    render(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);

    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: '앨범에서 사진 선택하기' }));
    expect(picker.handleCameraClick).toHaveBeenCalledTimes(1);

    act(() => picker.options.onSelect?.(PHOTO));

    expect(screen.getByRole('dialog', { name: '프로필 사진 조정' })).toBeTruthy();
  });

  it('조정 화면에서 뒤로 가면 사진을 바꾸지 않는다', async () => {
    const onChange = vi.fn();
    render(<ProfilePhotoField value={undefined} onChange={onChange} />);

    act(() => picker.options.onSelect?.(PHOTO));
    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(screen.queryByRole('dialog', { name: '프로필 사진 조정' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('조정을 마치면 자른 사진을 넘기고 초점을 카메라 버튼으로 되돌린다', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,CROP',
    );
    const onChange = vi.fn();
    render(<ProfilePhotoField value={undefined} onChange={onChange} />);

    act(() => picker.options.onSelect?.(PHOTO));
    const image = document.querySelector('img[src="' + PHOTO + '"]');
    if (!image) throw new Error('조정 사진 없음');
    Object.defineProperty(image, 'naturalWidth', { value: 504 });
    Object.defineProperty(image, 'naturalHeight', { value: 504 });
    fireEvent.load(image);
    await userEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(onChange).toHaveBeenCalledWith('data:image/jpeg;base64,CROP');
    expect(screen.getByText('사진을 바꿨어요')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: '프로필 사진 조정' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '프로필 사진 변경' }));
  });

  it('불러오는 중에 취소하면 읽기가 끝나도 조정 화면을 열지 않는다', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    picker.isPending = true;
    const { rerender } = render(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText('사진을 불러오는 중')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    picker.isPending = false;
    rerender(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);
    act(() => picker.options.onSelect?.(PHOTO));

    expect(screen.queryByRole('dialog', { name: '프로필 사진 조정' })).toBeNull();
  });

  it('불러오는 중에 취소한 뒤 읽기가 실패해도 토스트 없이 다음 선택은 연다', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    picker.isPending = true;
    const { rerender } = render(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    picker.isPending = false;
    rerender(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);
    act(() => picker.options.onError?.(new Error(PROFILE_IMAGE_RULES.invalidMessage)));
    expect(toast).not.toHaveBeenCalled();

    act(() => picker.options.onSelect?.(PHOTO));
    expect(screen.getByRole('dialog', { name: '프로필 사진 조정' })).toBeTruthy();
  });

  it('불러오는 중에 취소하고 읽기가 끝나기 전에 다시 골라도 취소한 사진은 열지 않는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    picker.isPending = true;
    render(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: '앨범에서 사진 선택하기' }));
    act(() => picker.options.onSelect?.(PHOTO));

    expect(screen.queryByRole('dialog', { name: '프로필 사진 조정' })).toBeNull();
  });

  it('사진을 자르지 못하면 조정 화면을 닫고 사진은 그대로 둔 채 안내한다', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const onChange = vi.fn();
    render(<ProfilePhotoField value={undefined} onChange={onChange} />);

    act(() => picker.options.onSelect?.(PHOTO));
    const image = document.querySelector(`img[src="${PHOTO}"]`);
    if (!image) throw new Error('조정 사진 없음');
    Object.defineProperty(image, 'naturalWidth', { value: 504 });
    Object.defineProperty(image, 'naturalHeight', { value: 504 });
    fireEvent.load(image);
    await userEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(screen.queryByRole('dialog', { name: '프로필 사진 조정' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('이 사진은 사용할 수 없어요.');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '프로필 사진 변경' }));
  });

  it('사진을 쓸 수 없으면 규칙 문구로 토스트를 띄운다', () => {
    render(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);

    act(() => picker.options.onError?.(new Error(PROFILE_IMAGE_RULES.invalidMessage)));

    expect(toast).toHaveBeenCalledWith('JPEG・PNG・HEIC・WebP, 10MB 이하만 가능해요.');
  });

  it('지금 사진이 없으면 기본 프로필 이미지를 보여 준다', () => {
    render(<ProfilePhotoField value={undefined} onChange={vi.fn()} />);

    expect(document.querySelector('img[src="/images/default-profile.svg"]')).toBeTruthy();
  });
});
