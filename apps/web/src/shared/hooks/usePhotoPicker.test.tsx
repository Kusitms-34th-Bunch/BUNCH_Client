import type { ChangeEvent } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PROFILE_IMAGE_RULES } from '@/shared/lib/imageFile';
import { usePhotoPicker } from './usePhotoPicker';

const native = vi.hoisted(() => ({
  isReactNativeWebView: true,
  isNativeMethodAvailable: vi.fn(() => true),
  pickGalleryImage: vi.fn(),
}));
vi.mock('@/shared/bridge/client', () => ({
  galleryBridge: native,
  isNativeShell: () => native.isReactNativeWebView,
}));
const imageUrl = 'data:image/jpeg;base64,YWJj';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  native.isReactNativeWebView = true;
  native.isNativeMethodAvailable.mockReturnValue(true);
  native.pickGalleryImage.mockReset();
});

it('네이티브 사진을 미리 보고 취소하면 기존 사진을 유지한다', async () => {
  native.pickGalleryImage.mockResolvedValueOnce({ dataUrl: imageUrl }).mockResolvedValueOnce(null);
  const { result } = renderHook(usePhotoPicker);
  act(() => result.current.handleCameraClick());
  await waitFor(() => expect(result.current.photoUrl).toBe(imageUrl));
  expect(result.current.message).toBe('사진을 선택했어요.');
  act(() => result.current.handleCameraClick());
  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(result.current.photoUrl).toBe(imageUrl);
  expect(result.current.message).toBe('');
});

it('선택 중 중복 호출을 막고 실패 후 다시 선택할 수 있다', async () => {
  let reject: (_error: Error) => void = () => {};
  native.pickGalleryImage.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  const { result } = renderHook(usePhotoPicker);
  act(() => {
    result.current.handleCameraClick();
    result.current.handleCameraClick();
  });
  expect(native.pickGalleryImage).toHaveBeenCalledTimes(1);
  expect(result.current.isPending).toBe(true);
  await act(async () => {
    reject(new Error('permission denied'));
    await Promise.resolve();
  });
  expect(result.current.message).toContain('접근 설정');
  expect(result.current.isPending).toBe(false);
  native.pickGalleryImage.mockResolvedValueOnce({ dataUrl: imageUrl });
  act(() => result.current.handleCameraClick());
  await waitFor(() => expect(result.current.photoUrl).toBe(imageUrl));
});

it('화면을 떠난 뒤 선택이 실패하면 onError를 부르지 않는다', async () => {
  let reject: (_error: Error) => void = () => {};
  native.pickGalleryImage.mockImplementationOnce(
    () =>
      new Promise((_resolve, rejectPick) => {
        reject = rejectPick;
      }),
  );
  const onError = vi.fn();
  const { result, unmount } = renderHook(() => usePhotoPicker({ onError }));
  act(() => result.current.handleCameraClick());
  unmount();

  await act(async () => {
    reject(new Error('picker failed'));
    await Promise.resolve();
  });

  expect(onError).not.toHaveBeenCalled();
});

it('잘못된 네이티브 응답을 이미지로 사용하지 않는다', async () => {
  native.pickGalleryImage.mockResolvedValue({ dataUrl: 'file:///private/photo.jpg' });
  const { result } = renderHook(usePhotoPicker);
  act(() => result.current.handleCameraClick());
  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(result.current.photoUrl).toBeUndefined();
  expect(result.current.message).toContain('사진을 선택하지 못했어요');
});

it('이전 개발 앱에서는 업데이트를 안내한다', () => {
  native.isNativeMethodAvailable.mockReturnValue(false);
  const { result } = renderHook(usePhotoPicker);
  act(() => result.current.handleCameraClick());
  expect(native.pickGalleryImage).not.toHaveBeenCalled();
  expect(result.current.message).toContain('업데이트');
});

function fileEvent(file: File): ChangeEvent<HTMLInputElement> {
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', { value: [file] });
  return { currentTarget: input } as ChangeEvent<HTMLInputElement>;
}

it('웹에서는 사용자 클릭에서 파일 input을 즉시 연다', () => {
  native.isReactNativeWebView = false;
  const { result } = renderHook(usePhotoPicker);
  const input = document.createElement('input');
  const click = vi.spyOn(input, 'click');
  result.current.inputRef.current = input;
  act(() => result.current.handleCameraClick());
  expect(click).toHaveBeenCalledTimes(1);
  expect(native.pickGalleryImage).not.toHaveBeenCalled();
});

it('지원하지 않는 파일과 3MB 초과 파일을 거부한다', async () => {
  const { result } = renderHook(usePhotoPicker);
  const files = [
    new File(['x'], 'x.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'x.jpg', { type: 'image/jpeg' }),
  ];
  for (const file of files) {
    act(() => result.current.handleFileChange(fileEvent(file)));
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.photoUrl).toBeUndefined();
    expect(result.current.message).toContain('3MB 이하');
  }
});

it('웹 이미지를 디코딩한 뒤 미리 보고 같은 파일을 다시 고를 수 있다', async () => {
  const image = {
    src: '',
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  vi.stubGlobal(
    'Image',
    class {
      constructor() {
        return image;
      }
    },
  );
  const { result } = renderHook(usePhotoPicker);
  const event = fileEvent(new File(['abc'], 'x.png', { type: 'image/png' }));
  act(() => result.current.handleFileChange(event));
  await waitFor(() => expect(image.src).toContain('data:image/png;base64,'));
  expect(result.current.photoUrl).toBeUndefined();
  act(() => {
    image.onload?.();
  });
  await waitFor(() => expect(result.current.photoUrl).toContain('data:image/png;base64,'));
  expect(event.currentTarget.value).toBe('');
});

it('깨진 웹 이미지는 미리보기를 바꾸지 않는다', async () => {
  const image = {
    src: '',
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  vi.stubGlobal(
    'Image',
    class {
      constructor() {
        return image;
      }
    },
  );
  const { result } = renderHook(usePhotoPicker);
  act(() =>
    result.current.handleFileChange(
      fileEvent(new File(['broken'], 'x.jpg', { type: 'image/jpeg' })),
    ),
  );
  await waitFor(() => expect(image.src).toContain('data:image/jpeg;base64,'));
  act(() => {
    image.onerror?.();
  });
  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(result.current.photoUrl).toBeUndefined();
  expect(result.current.message).toBe('이 사진은 사용할 수 없어요.');
});

it('nativeEdit가 false면 앱에 시스템 편집 없이 고르라고 요청하고, 고른 뒤 onSelect를 부른다', async () => {
  native.pickGalleryImage.mockResolvedValueOnce({ dataUrl: imageUrl });
  const onSelect = vi.fn();
  const { result } = renderHook(() => usePhotoPicker({ nativeEdit: false, onSelect }));

  act(() => result.current.handleCameraClick());

  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(imageUrl));
  expect(native.pickGalleryImage).toHaveBeenCalledWith({ edit: false });
});

it('기본은 앱에 옵션 없이 요청한다(정사각형 편집 유지)', async () => {
  native.pickGalleryImage.mockResolvedValueOnce(null);
  const { result } = renderHook(() => usePhotoPicker());

  act(() => result.current.handleCameraClick());

  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(native.pickGalleryImage).toHaveBeenCalledWith(undefined);
});

it('프로필 규칙이면 10MB 초과·지원하지 않는 형식을 규칙 문구로 거부한다', async () => {
  native.isReactNativeWebView = false;
  const onError = vi.fn();
  const { result } = renderHook(() => usePhotoPicker({ rules: PROFILE_IMAGE_RULES, onError }));
  const choose = (file: File) =>
    act(() =>
      result.current.handleFileChange({
        currentTarget: { files: [file], value: 'x' },
      } as unknown as ChangeEvent<HTMLInputElement>),
    );

  choose(new File([new Uint8Array(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' }));
  await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  choose(new File(['gif'], 'a.gif', { type: 'image/gif' }));
  await waitFor(() => expect(onError).toHaveBeenCalledTimes(2));

  expect(onError.mock.calls.map(([error]) => (error as Error).message)).toEqual([
    PROFILE_IMAGE_RULES.invalidMessage,
    PROFILE_IMAGE_RULES.invalidMessage,
  ]);
});

it('픽셀 수가 너무 큰 웹 이미지는 바이트가 작아도 거절한다', async () => {
  const image = {
    src: '',
    naturalWidth: 10_000,
    naturalHeight: 6_000,
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  vi.stubGlobal(
    'Image',
    class {
      constructor() {
        return image;
      }
    },
  );
  const { result } = renderHook(usePhotoPicker);
  act(() =>
    result.current.handleFileChange(fileEvent(new File(['big'], 'x.png', { type: 'image/png' }))),
  );
  await waitFor(() => expect(image.src).toContain('data:image/png;base64,'));
  act(() => {
    image.onload?.();
  });
  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(result.current.photoUrl).toBeUndefined();
  expect(result.current.message).toBe('이 사진은 사용할 수 없어요.');
});
