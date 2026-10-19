import type { ChangeEvent } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
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
