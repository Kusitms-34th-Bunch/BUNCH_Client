import type * as DesignSystem from '@app/design-system';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type * as PhotoUploadLib from '../lib/photoUpload';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { uploadStatusStore } from '../lib/uploadStatus';
import { photoBoxKeys } from '../queries/keys';
import { usePhotoUpload } from './usePhotoUpload';

// 올리는 도중 목록 갱신 간격을 짧게 해서 테스트가 오래 걸리지 않게 함(필요한 테스트만 바꿈)
const refreshInterval = vi.hoisted(() => ({ ms: 30 }));
vi.mock('../lib/photoUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof PhotoUploadLib>()),
  get UPLOAD_LIST_REFRESH_MS() {
    return refreshInterval.ms;
  },
}));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toastSpy = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toastSpy(...args),
}));

const bridge = vi.hoisted(() => ({
  native: true,
  methodAvailable: true,
  pickGalleryImages: vi.fn(),
  capturePhoto: vi.fn(),
  readPickedPhoto: vi.fn(),
  releasePickedPhotos: vi.fn(),
  openAppSettings: vi.fn(),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => bridge.native,
  photoUploadBridge: {
    isNativeMethodAvailable: () => bridge.methodAvailable,
    pickGalleryImages: bridge.pickGalleryImages,
    capturePhoto: bridge.capturePhoto,
    readPickedPhoto: bridge.readPickedPhoto,
    releasePickedPhotos: bridge.releasePickedPhotos,
    openAppSettings: bridge.openAppSettings,
  },
}));

const bunchId = String(MOCK_BUNCH_ID);

// 사진 id마다 다른 바이트의 JPEG를 돌려줘서 서버가 서로 다른 사진으로 판별하게 함
// 웹이 JPEG 시작 바이트(FF D8 FF)를 확인하므로 실제 JPEG처럼 시작하는 바이트를 만듦
const imageOf = (id: string) => ({
  dataUrl: `data:image/jpeg;base64,${btoa(`${String.fromCharCode(0xff, 0xd8, 0xff, 0xe0)}${id}-${Math.random()}`)}`,
});

const pickedAlbum = (...ids: string[]) => ({
  status: 'picked' as const,
  photos: ids.map((id, index) =>
    index === 0 ? { id, capturedDate: '2026-10-19', capturedTime: '19:30:05' } : { id },
  ),
});

// 번치를 아직 모르는 경우(undefined)도 넘길 수 있도록 값을 객체로 받음
const render = (
  initial: { id: string | undefined } = { id: bunchId },
  client = createTestQueryClient(),
) =>
  renderHook(({ id }) => usePhotoUpload(id), {
    initialProps: initial,
    wrapper: createQueryWrapper(client),
  });

const photoCount = () =>
  mockDb.get().photos.filter((photo) => photo.bunchId === MOCK_BUNCH_ID).length;

// 마지막 결과 토스트(문구와 옵션)
const lastToast = () => toastSpy.mock.calls.at(-1);

beforeEach(() => {
  toastSpy.mockClear();
  refreshInterval.ms = 30;
  uploadStatusStore.reset();
  // jsdom에는 blob 주소 만들기가 없어 상태 줄 썸네일 주소를 고정 값으로 대신함
  URL.createObjectURL = vi.fn(() => 'blob:thumbnail');
  URL.revokeObjectURL = vi.fn();
  bridge.native = true;
  bridge.methodAvailable = true;
  bridge.pickGalleryImages.mockReset();
  bridge.capturePhoto.mockReset();
  bridge.readPickedPhoto
    .mockReset()
    .mockImplementation((id: string) => Promise.resolve(imageOf(id)));
  bridge.releasePickedPhotos.mockReset().mockResolvedValue(undefined);
  bridge.openAppSettings.mockReset().mockResolvedValue(undefined);
});

describe('usePhotoUpload 올리기 불가 환경', () => {
  it('쉘이 없는 브라우저에서는 안내만 하고 선택창을 열지 않는다', async () => {
    bridge.native = false;
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(toastSpy).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.uploadUnavailable);
    expect(bridge.pickGalleryImages).not.toHaveBeenCalled();
  });

  it('새 bridge 메서드가 없는 이전 쉘에서는 업데이트를 안내한다', async () => {
    bridge.methodAvailable = false;
    const { result } = render();

    await act(() => result.current.start('camera'));

    expect(toastSpy).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.uploadNeedsUpdate);
    expect(bridge.capturePhoto).not.toHaveBeenCalled();
  });

  it('번치를 아직 모르면 아무것도 하지 않는다', async () => {
    const { result } = render({ id: undefined });

    await act(() => result.current.start('album'));

    expect(bridge.pickGalleryImages).not.toHaveBeenCalled();
    expect(toastSpy).not.toHaveBeenCalled();
  });
});

describe('usePhotoUpload 선택·촬영', () => {
  it('선택창에서 취소하면 아무것도 올리지 않고 토스트도 띄우지 않는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue({ status: 'canceled' });
    const before = photoCount();
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(photoCount()).toBe(before);
    expect(toastSpy).not.toHaveBeenCalled();
    expect(bridge.readPickedPhoto).not.toHaveBeenCalled();
  });

  it('선택·촬영 창을 열다 오류가 나면 오류 토스트를 띄운다', async () => {
    bridge.pickGalleryImages.mockRejectedValue(new Error('native failed'));
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(toastSpy).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.uploadFailed);
  });

  it('카메라 권한이 거부되어 있으면 안내 창을 열고 「설정 열기」로 설정 화면에 보낸다', async () => {
    bridge.capturePhoto.mockResolvedValue({ status: 'denied' });
    const user = userEvent.setup();
    const { result } = render();

    await act(() => result.current.start('camera'));

    expect(await screen.findByText(PHOTO_BOX_MESSAGES.cameraPermissionTitle)).toBeTruthy();
    expect(screen.getByText(PHOTO_BOX_MESSAGES.cameraPermissionDescription)).toBeTruthy();
    expect(bridge.openAppSettings).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: PHOTO_BOX_MESSAGES.openSettings }));
    expect(bridge.openAppSettings).toHaveBeenCalledTimes(1);
    // 설정 앱에서 돌아왔을 때 「거부되어 있어요」 안내가 남지 않도록 창이 닫힘
    await waitFor(() =>
      expect(screen.queryByText(PHOTO_BOX_MESSAGES.cameraPermissionTitle)).toBeNull(),
    );
  });
});

describe('usePhotoUpload 업로드 결과', () => {
  it('전부 올라가면 추가한 장수를 한 번만 알리고, 읽은 사진은 그때마다 놓아 준다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    const before = photoCount();
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(photoCount()).toBe(before + 2);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(lastToast()).toEqual(['2장의 사진을 사진함에 추가했어요.', undefined]);
    expect(bridge.releasePickedPhotos).toHaveBeenCalledTimes(2);
    expect(bridge.releasePickedPhotos).toHaveBeenCalledWith(['p1']);
    expect(bridge.releasePickedPhotos).toHaveBeenCalledWith(['p2']);
  });

  it('촬영 날짜·시각이 있는 사진과 없는 사진이 각각 그대로 저장된다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    const { result } = render();
    const existing = new Set(mockDb.get().photos.map((photo) => photo.photoId));

    await act(() => result.current.start('album'));

    const created = mockDb.get().photos.filter((photo) => !existing.has(photo.photoId));
    expect(created.map((photo) => [photo.capturedDate, photo.capturedTime])).toEqual(
      expect.arrayContaining([
        ['2026-10-19', '19:30:05'],
        [null, null],
      ]),
    );
  });

  it('일부가 한도 등으로 거절되면 추가한 장수와 올리지 못한 장수를 함께 알리고 다시 시도는 없다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    let calls = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        calls += 1;
        return calls === 1 ? ok({ photoId: 7_001, result: 'STORED' }) : fail(409, 'PHOTO_001');
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(lastToast()).toEqual(['1장을 추가했어요. 1장은 올리지 못했어요.', undefined]);
  });

  it('쉘에서 사진을 읽지 못한 사진은 올리지 못한 사진으로 세고 다시 시도 대상은 아니다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    bridge.readPickedPhoto.mockImplementation((id: string) =>
      id === 'p2' ? Promise.reject(new Error('read failed')) : Promise.resolve(imageOf(id)),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(lastToast()).toEqual(['1장을 추가했어요. 1장은 올리지 못했어요.', undefined]);
    // 읽지 못한 사진도 쉘이 들고 있지 않도록 놓아 줌
    expect(bridge.releasePickedPhotos).toHaveBeenCalledWith(['p2']);
  });

  it('하나도 못 올리면 장수 없이 알린다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    server.use(http.post('/api/bunches/:bunchId/photos', () => fail(409, 'PHOTO_002')));
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(lastToast()).toEqual(['사진을 올리지 못했어요.', undefined]);
  });
});

describe('usePhotoUpload 원본 해시', () => {
  it('쉘이 준 원본 해시를 업로드 요청에 담고, 「다시 시도」도 같은 값을 보낸다', async () => {
    const HASH = 'd'.repeat(64);
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    bridge.readPickedPhoto.mockImplementation((id: string) =>
      Promise.resolve({ ...imageOf(id), originalFileHash: HASH }),
    );
    const sent: (string | null)[] = [];
    let failNext = true;
    server.use(
      http.post('/api/bunches/:bunchId/photos', async ({ request }) => {
        const form = await request.clone().formData();
        sent.push(form.get('originalFileHash') as string | null);
        if (failNext) {
          failNext = false;
          return fail(503, 'PHOTO_007');
        }
        return undefined;
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));
    const [, options] = lastToast() ?? [];
    act(() => options?.action?.onClick());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(2));

    expect(sent).toEqual([HASH, HASH]);
    // 다시 시도 때는 쉘에서 사진을 다시 읽지 않으므로 해시도 다시 계산하지 않음
    expect(bridge.readPickedPhoto).toHaveBeenCalledTimes(1);
  });

  it('원본 해시를 받지 못한 사진은 필드 없이 올린다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    let sentField: unknown = 'sent';
    server.use(
      http.post('/api/bunches/:bunchId/photos', async ({ request }) => {
        sentField = (await request.clone().formData()).get('originalFileHash');
        return undefined;
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(sentField).toBeNull();
  });
});

describe('usePhotoUpload UTC 오프셋·원본 유형', () => {
  it('쉘이 준 UTC 오프셋과 원본 유형을 업로드 요청에 담고, 「다시 시도」도 같은 값을 보낸다', async () => {
    bridge.pickGalleryImages.mockResolvedValue({
      status: 'picked' as const,
      photos: [{ id: 'p1', capturedUtcOffset: '+09:00', sourceType: 'CAMERA' as const }],
    });
    const sent: unknown[][] = [];
    let failNext = true;
    server.use(
      http.post('/api/bunches/:bunchId/photos', async ({ request }) => {
        const form = await request.clone().formData();
        sent.push([form.get('capturedUtcOffset'), form.get('sourceType')]);
        if (failNext) {
          failNext = false;
          return fail(503, 'PHOTO_007');
        }
        return undefined;
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));
    const [, options] = lastToast() ?? [];
    act(() => options?.action?.onClick());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(2));

    expect(sent).toEqual([
      ['+09:00', 'CAMERA'],
      ['+09:00', 'CAMERA'],
    ]);
  });

  it('이전 쉘처럼 두 값이 없는 사진은 필드 없이 올린다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    let sent: unknown[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/photos', async ({ request }) => {
        const form = await request.clone().formData();
        sent = [form.get('capturedUtcOffset'), form.get('sourceType')];
        return undefined;
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(sent).toEqual([null, null]);
  });
});

describe('usePhotoUpload 다시 시도', () => {
  it('일시 장애로 못 올린 사진에만 「다시 시도」가 붙고, 누르면 같은 묶음 ID로 같은 파일을 다시 보낸다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    const requests: { batch: string; photo: string }[] = [];
    let failNext = true;
    server.use(
      http.post('/api/bunches/:bunchId/photos', async ({ request }) => {
        const form = await request.clone().formData();
        const batch = form.get('uploadBatchId') as string;
        const file = form.get('photo') as Blob;
        requests.push({ batch, photo: await file.text() });
        // 둘째 사진만 한 번 일시 장애를 겪게 함
        if (requests.length === 2 && failNext) {
          failNext = false;
          return fail(503, 'PHOTO_007');
        }
        return undefined;
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    // 1장은 올라가고 1장은 일시 장애: 「다시 시도」가 붙은 토스트
    const [message, options] = lastToast() ?? [];
    expect(message).toBe('1장을 추가했어요. 1장은 올리지 못했어요.');
    expect(options?.action?.label).toBe(PHOTO_BOX_MESSAGES.uploadRetry);
    const before = photoCount();

    act(() => options?.action?.onClick());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(2));

    // 다시 시도한 사진의 결과만 알리고, 사진함에 한 장이 더 들어감
    expect(lastToast()).toEqual(['1장의 사진을 사진함에 추가했어요.', undefined]);
    expect(photoCount()).toBe(before + 1);
    expect(requests).toHaveLength(3);
    // 같은 묶음 ID를 유지하고, 처음 만든 파일을 그대로(다시 압축하지 않고) 다시 보냄
    expect(new Set(requests.map((request) => request.batch)).size).toBe(1);
    expect(requests[2]?.photo).toBe(requests[1]?.photo);
    // 다시 시도 때는 쉘에서 사진을 다시 읽지 않음
    expect(bridge.readPickedPhoto).toHaveBeenCalledTimes(2);
  });

  it('다시 시도해도 또 실패하면 「다시 시도」가 다시 붙는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    server.use(http.post('/api/bunches/:bunchId/photos', () => fail(503, 'PHOTO_007')));
    const { result } = render();

    await act(() => result.current.start('album'));
    const [first, firstOptions] = lastToast() ?? [];
    expect(first).toBe('사진을 올리지 못했어요.');

    act(() => firstOptions?.action?.onClick());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(2));

    const [second, secondOptions] = lastToast() ?? [];
    expect(second).toBe('사진을 올리지 못했어요.');
    expect(secondOptions?.action?.label).toBe(PHOTO_BOX_MESSAGES.uploadRetry);
  });

  it('응답이 끊겼지만 서버에는 저장된 사진을 다시 시도해 이미 있다고 나오면 추가한 것으로 알린다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    let calls = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        calls += 1;
        // 첫 요청은 응답이 끊기고(서버에는 저장됨), 다시 시도하면 이미 있다고 응답
        return calls === 1
          ? fail(503, 'PHOTO_007')
          : ok({ photoId: 7_300, result: 'ALREADY_UPLOADED' });
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));
    const [, options] = lastToast() ?? [];
    act(() => options?.action?.onClick());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(2));

    expect(lastToast()).toEqual(['1장의 사진을 사진함에 추가했어요.', undefined]);
  });
});

describe('usePhotoUpload 대상 번치', () => {
  it('올리는 중에 번치가 바뀌어도 올리기를 시작한 번치에 저장한다', async () => {
    let resolvePick: (_value: ReturnType<typeof pickedAlbum>) => void = () => {};
    bridge.pickGalleryImages.mockReturnValue(
      new Promise((resolve) => {
        resolvePick = resolve;
      }),
    );
    const urls: string[] = [];
    server.use(
      http.post('/api/bunches/:bunchId/photos', ({ request }) => {
        urls.push(new URL(request.url).pathname);
        return undefined;
      }),
    );
    const { result, rerender } = render({ id: '1' });

    let started: Promise<unknown> = Promise.resolve();
    act(() => {
      started = result.current.start('album');
    });
    // 선택창이 열려 있는 동안 사진함의 번치가 바뀜
    rerender({ id: '2' });
    resolvePick(pickedAlbum('p1'));
    await act(() => started);

    expect(urls).toEqual(['/api/bunches/1/photos']);
  });
});

describe('usePhotoUpload 한도와 보내기 전 확인', () => {
  it('하루·묶음 한도 오류(PHOTO_002)를 받으면 남은 사진은 읽지도 보내지도 않고 올리지 못한 사진으로 센다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2', 'p3', 'p4', 'p5'));
    let requests = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        requests += 1;
        return fail(409, 'PHOTO_002');
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    // 동시에 처리하던 3장만 읽고 보냄. 나머지 2장은 건너뜀
    expect(bridge.readPickedPhoto).toHaveBeenCalledTimes(3);
    expect(requests).toBe(3);
    expect(lastToast()).toEqual(['사진을 올리지 못했어요.', undefined]);
    // 건너뛴 사진도 쉘이 들고 있지 않도록 놓아 줌
    expect(bridge.releasePickedPhotos).toHaveBeenCalledTimes(5);
    expect(bridge.releasePickedPhotos).toHaveBeenCalledWith(['p5']);
  });

  it('쉘이 준 이미지가 JPEG가 아니면 보내지 않고 올리지 못한 사진으로 센다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    bridge.readPickedPhoto.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'p2' ? { dataUrl: 'data:image/jpeg;base64,' + btoa('not-a-jpeg') } : imageOf(id),
      ),
    );
    let requests = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        requests += 1;
        return undefined;
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(requests).toBe(1);
    expect(lastToast()).toEqual(['1장을 추가했어요. 1장은 올리지 못했어요.', undefined]);
  });

  it('BFF가 백엔드에 닿지 못해 끊긴 사진(502)에도 「다시 시도」가 붙는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => fail(502, 'BFF_UPSTREAM_UNAVAILABLE')),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    const [message, options] = lastToast() ?? [];
    expect(message).toBe('사진을 올리지 못했어요.');
    expect(options?.action?.label).toBe(PHOTO_BOX_MESSAGES.uploadRetry);
  });
});

describe('usePhotoUpload 업로드 상태 줄', () => {
  const statusOf = () => uploadStatusStore.getSnapshot()[bunchId];
  // 사진함 화면이 이 번치의 상태 줄을 보고 있는 경우
  let unwatch: () => void = () => {};
  beforeEach(() => {
    unwatch = uploadStatusStore.watch(bunchId);
  });
  afterEach(() => {
    unwatch();
  });

  it('올리는 동안 전체·끝난 장수와 첫 사진 썸네일을 기록하고, 끝나면 결과 문구를 남기며 토스트는 띄우지 않는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post('/api/bunches/:bunchId/photos', async () => {
        await gate;
        return undefined;
      }),
    );
    const { result } = render();

    let started: Promise<unknown> = Promise.resolve();
    act(() => {
      started = result.current.start('album', { statusLine: true });
    });
    await waitFor(() => expect(statusOf()?.thumbnailUrl).toBe('blob:thumbnail'));
    // 두 장 모두 받았지만 응답 전이라 진행 바는 반만 참
    await waitFor(() =>
      expect(statusOf()).toMatchObject({ phase: 'uploading', total: 2, done: 0, steps: 2 }),
    );

    release();
    await act(() => started);
    expect(statusOf()).toMatchObject({
      phase: 'complete',
      total: 2,
      done: 2,
      steps: 4,
      message: '2장의 사진을 사진함에 추가했어요.',
      withBundleHint: true,
    });
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('일부를 올리지 못해도 한 장이라도 추가됐으면 결과 문구와 함께 둘째 줄 안내를 붙인다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    let calls = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        calls += 1;
        return calls === 1 ? ok({ photoId: 7_001, result: 'STORED' }) : fail(409, 'PHOTO_001');
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album', { statusLine: true }));

    expect(statusOf()).toMatchObject({
      phase: 'complete',
      message: '1장을 추가했어요. 1장은 올리지 못했어요.',
      withBundleHint: true,
    });
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('한도 오류로 남은 사진을 건너뛰거나 읽지 못한 사진도 끝난 장수에 세어 완료하고, 추가한 사진이 없으면 둘째 줄이 없다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2', 'p3', 'p4', 'p5'));
    bridge.readPickedPhoto.mockImplementation((id: string) =>
      id === 'p1' ? Promise.reject(new Error('read failed')) : Promise.resolve(imageOf(id)),
    );
    server.use(http.post('/api/bunches/:bunchId/photos', () => fail(409, 'PHOTO_002')));
    const { result } = render();

    await act(() => result.current.start('album', { statusLine: true }));

    expect(statusOf()).toMatchObject({
      phase: 'complete',
      total: 5,
      done: 5,
      steps: 10,
      message: '사진을 올리지 못했어요.',
      withBundleHint: false,
    });
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('상태 줄을 보는 화면이 없으면(사진 상세 등) 결과를 토스트로 대신 알린다', async () => {
    unwatch();
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    const { result } = render();

    await act(() => result.current.start('album', { statusLine: true }));

    expect(statusOf()?.phase).toBe('complete');
    expect(lastToast()).toEqual(['1장의 사진을 사진함에 추가했어요.', undefined]);
  });

  it('다른 탭에 가 있어 페이지가 숨어 있으면 결과 토스트를 미뤘다가 다시 보일 때 띄우고, 그때부터 상태 줄 유지 시간을 센다', async () => {
    unwatch();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    const { result } = render();

    await act(() => result.current.start('album', { statusLine: true }));
    expect(toastSpy).not.toHaveBeenCalled();
    expect(statusOf()).toMatchObject({ phase: 'complete', shownAt: undefined });

    visibility.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(lastToast()).toEqual(['1장의 사진을 사진함에 추가했어요.', undefined]);
    const shown = statusOf();
    expect(shown?.phase === 'complete' ? typeof shown.shownAt : undefined).toBe('number');
    visibility.mockRestore();
  });

  it('숨어 있는 사이 사진함이 다른 번치로 바뀌었으면 다시 보일 때 원래 번치의 결과를 토스트로 알린다', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    const { result } = render();

    await act(() => result.current.start('album', { statusLine: true }));
    expect(toastSpy).not.toHaveBeenCalled();

    // 다른 탭에서 번치를 바꿔 숨은 사진함이 다른 번치를 보게 됨
    unwatch();
    unwatch = uploadStatusStore.watch('other-bunch');
    visibility.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(lastToast()).toEqual(['1장의 사진을 사진함에 추가했어요.', undefined]);
    visibility.mockRestore();
  });

  it('올리는 중에 사진함을 다른 번치로 바꿨으면 원래 번치의 결과를 토스트로 알린다', async () => {
    unwatch();
    unwatch = uploadStatusStore.watch('other-bunch');
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    const { result } = render();

    await act(() => result.current.start('album', { statusLine: true }));

    expect(lastToast()).toEqual(['1장의 사진을 사진함에 추가했어요.', undefined]);
  });

  it('「다시 시도」할 사진이 있으면 토스트를 띄우고, 누르면 상태 줄이 다시 시도한 사진으로 새로 시작한다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    let calls = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        calls += 1;
        return calls === 1 ? fail(503, 'PHOTO_007') : undefined;
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album', { statusLine: true }));
    expect(statusOf()).toMatchObject({
      phase: 'complete',
      message: '사진을 올리지 못했어요.',
      withBundleHint: false,
    });
    const [message, options] = lastToast() ?? [];
    expect(message).toBe('사진을 올리지 못했어요.');
    expect(options?.action?.label).toBe(PHOTO_BOX_MESSAGES.uploadRetry);

    act(() => options?.action?.onClick());
    expect(statusOf()).toMatchObject({ phase: 'uploading', total: 1, done: 0, steps: 0 });
    await waitFor(() =>
      expect(statusOf()).toMatchObject({
        phase: 'complete',
        message: '1장의 사진을 사진함에 추가했어요.',
      }),
    );
    // 다시 시도가 모두 성공하면 다시 토스트를 띄우지 않음
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });

  it('상태 줄을 쓰지 않으면(번들 작성의 가져오기) 상태를 기록하지 않는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(statusOf()).toBeUndefined();
    expect(lastToast()).toEqual(['1장의 사진을 사진함에 추가했어요.', undefined]);
  });
});

describe('usePhotoUpload 상태 안내', () => {
  it('앨범 선택에서 권한 거부가 오면(계약상 없음) 카메라 안내 창 대신 일반 오류로 알린다', async () => {
    bridge.pickGalleryImages.mockResolvedValue({ status: 'denied' });
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(toastSpy).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.uploadFailed);
    expect(screen.queryByText(PHOTO_BOX_MESSAGES.cameraPermissionTitle)).toBeNull();
  });

  it('선택·촬영 창을 기다리는 사이 화면이 떠나면 카메라 권한 안내 창을 열지 않는다', async () => {
    let resolveCapture: (_value: { status: 'denied' }) => void = () => {};
    bridge.capturePhoto.mockReturnValue(
      new Promise((resolve) => {
        resolveCapture = resolve;
      }),
    );
    const { result, unmount } = render();

    let started: Promise<unknown> = Promise.resolve();
    act(() => {
      started = result.current.start('camera');
    });
    unmount();
    resolveCapture({ status: 'denied' });
    await started;

    expect(screen.queryByText(PHOTO_BOX_MESSAGES.cameraPermissionTitle)).toBeNull();
  });
});

describe('usePhotoUpload 사진 목록 갱신', () => {
  const invalidatedKeys = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.map((call) => (call[0] as { queryKey: unknown }).queryKey);

  it('사진이 한 장이라도 들어가면 그 번치의 사진 목록을 다시 받는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = render({ id: bunchId }, client);

    await act(() => result.current.start('album'));

    expect(invalidatedKeys(spy)).toEqual([photoBoxKeys.photos(bunchId)]);
  });

  it('응답을 받기 전에 끊긴 사진(다시 시도 대상)만 있어도 서버에는 저장됐을 수 있어 목록을 다시 받는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    server.use(http.post('/api/bunches/:bunchId/photos', () => fail(503, 'PHOTO_007')));
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = render({ id: bunchId }, client);

    await act(() => result.current.start('album'));

    expect(invalidatedKeys(spy)).toEqual([photoBoxKeys.photos(bunchId)]);
  });

  it('코드 없는 500처럼 서버 저장 여부를 알 수 없는 실패만 있어도 목록을 다시 받는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    server.use(http.post('/api/bunches/:bunchId/photos', () => fail(500, 'COMMON_500')));
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = render({ id: bunchId }, client);

    await act(() => result.current.start('album'));

    expect(invalidatedKeys(spy)).toEqual([photoBoxKeys.photos(bunchId)]);
  });

  it('올리는 도중에도 새로 올라간 사진이 있으면 끝나기 전에 목록을 다시 받는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let calls = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', async () => {
        calls += 1;
        // 둘째 사진은 응답을 붙잡아 두어 아직 올리는 중인 상태를 만듦
        if (calls === 2) await gate;
        return undefined;
      }),
    );
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = render({ id: bunchId }, client);

    let upload!: Promise<unknown>;
    act(() => {
      upload = result.current.start('album');
    });

    try {
      // 첫 사진이 올라가고 둘째가 아직 올라가는 중인데도 목록을 다시 받음
      await waitFor(() => expect(invalidatedKeys(spy)).toEqual([photoBoxKeys.photos(bunchId)]));
    } finally {
      release();
    }
    await act(() => upload);
    // 끝나면 한 번 더 받음(예약해 둔 갱신은 걷어서 겹치지 않음)
    expect(invalidatedKeys(spy)).toHaveLength(2);
  });

  it('올리는 중인 다른 묶음이 있으면, 새 사진 없이 끝난 묶음이 그 묶음의 목록 갱신 예약을 지우지 않는다', async () => {
    // 예약이 돌기 전에 B가 끝나도록 간격을 넉넉히(기다리는 한도 1초보다는 짧게)
    refreshInterval.ms = 300;
    bridge.pickGalleryImages
      .mockResolvedValueOnce(pickedAlbum('a1', 'a2'))
      .mockResolvedValueOnce(pickedAlbum('b1'));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let calls = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', async () => {
        calls += 1;
        // 묶음 A의 둘째 사진은 붙잡아 두고, 묶음 B의 사진은 한도로 거절(새 사진 없음)
        if (calls === 2) await gate;
        if (calls === 3) return fail(409, 'PHOTO_001');
        return undefined;
      }),
    );
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = render({ id: bunchId }, client);

    let uploadA!: Promise<unknown>;
    act(() => {
      uploadA = result.current.start('album');
    });
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    try {
      // A의 첫 사진이 올라가 300ms 갱신 예약이 실제로 걸린 뒤(둘째 사진은 붙잡힌 채) B를 올림
      await waitFor(() =>
        expect(timeoutSpy.mock.calls.some(([, delay]) => delay === refreshInterval.ms)).toBe(true),
      );
      await act(() => result.current.start('album'));
      // 전제: B는 예약이 돌기 전에 끝남(아니면 결함이 있어도 통과하므로 여기서 실패로 드러냄)
      expect(invalidatedKeys(spy)).toEqual([]);
      // A가 끝나기 전에도 A의 첫 사진이 목록에 반영됨
      await waitFor(() => expect(invalidatedKeys(spy)).toEqual([photoBoxKeys.photos(bunchId)]));
    } finally {
      release();
      timeoutSpy.mockRestore();
    }
    await act(() => uploadA);
  });

  it('한도·형식 오류로 하나도 못 올렸으면 목록을 다시 받지 않는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
    server.use(http.post('/api/bunches/:bunchId/photos', () => fail(409, 'PHOTO_001')));
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = render({ id: bunchId }, client);

    await act(() => result.current.start('album'));

    expect(spy).not.toHaveBeenCalled();
  });

  it('올리는 중에 번치가 바뀌어도 처음 정한 번치의 목록을 다시 받는다', async () => {
    let resolvePick: (_value: ReturnType<typeof pickedAlbum>) => void = () => {};
    bridge.pickGalleryImages.mockReturnValue(
      new Promise((resolve) => {
        resolvePick = resolve;
      }),
    );
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result, rerender } = render({ id: '1' }, client);

    let started: Promise<unknown> = Promise.resolve();
    act(() => {
      started = result.current.start('album');
    });
    rerender({ id: '2' });
    resolvePick(pickedAlbum('p1'));
    await act(() => started);

    expect(invalidatedKeys(spy)).toEqual([photoBoxKeys.photos('1')]);
  });
});

describe('usePhotoUpload 한도 오류별 동작', () => {
  it('한 번에 올릴 수 있는 수(PHOTO_003)를 넘으면 남은 사진은 읽지도 보내지도 않는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2', 'p3', 'p4', 'p5'));
    server.use(http.post('/api/bunches/:bunchId/photos', () => fail(409, 'PHOTO_003')));
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(bridge.readPickedPhoto).toHaveBeenCalledTimes(3);
    expect(lastToast()).toEqual(['사진을 올리지 못했어요.', undefined]);
  });

  it('사진함이 가득 찬 오류(PHOTO_001)는 같은 사진 합치기가 허용될 수 있어 남은 사진도 계속 보낸다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2', 'p3', 'p4', 'p5'));
    let requests = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        requests += 1;
        return fail(409, 'PHOTO_001');
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(requests).toBe(5);
    expect(bridge.readPickedPhoto).toHaveBeenCalledTimes(5);
  });

  it('다시 시도에서도 한도 오류를 받으면 남은 사진은 보내지 않는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2', 'p3', 'p4', 'p5'));
    // 처음에는 모두 일시 장애(다시 시도 대상), 다시 시도할 때는 하루 한도 오류
    let phase: 'transient' | 'limit' = 'transient';
    let requests = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        requests += 1;
        return phase === 'transient' ? fail(503, 'PHOTO_007') : fail(409, 'PHOTO_002');
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));
    const [, options] = lastToast() ?? [];
    expect(requests).toBe(5);

    phase = 'limit';
    requests = 0;
    act(() => options?.action?.onClick());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(2));

    // 동시에 보낸 3장만 한도 오류를 받고, 나머지 2장은 보내지 않음
    expect(requests).toBe(3);
    expect(lastToast()?.[0]).toBe('사진을 올리지 못했어요.');
    // 한도 오류는 다시 시도 대상이 아니므로 「다시 시도」가 더 이상 붙지 않음
    expect(lastToast()?.[1]).toBeUndefined();
  });
});

describe('usePhotoUpload 내가 이미 올린 사진', () => {
  it('내가 이미 올린 같은 사진(ALREADY_UPLOADED)은 중복으로 빼고 추가한 장수를 알린다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2', 'p3'));
    let calls = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        calls += 1;
        // 둘째 사진만 내가 이미 올린 사진이라 서버가 변경 없이 제외함
        return calls === 2
          ? ok({ photoId: 7_002, result: 'ALREADY_UPLOADED' })
          : ok({ photoId: 7_000 + calls, result: 'STORED' });
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(lastToast()).toEqual(['중복된 1장을 제외하고, 사진 2장을 추가했어요.', undefined]);
  });

  it('모두 내가 이미 올린 사진이면 이미 업로드된 사진이라는 토스트를 띄운다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    server.use(
      http.post('/api/bunches/:bunchId/photos', () =>
        ok({ photoId: 7_100, result: 'ALREADY_UPLOADED' }),
      ),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(lastToast()).toEqual(['이미 사진함에 업로드된 사진이에요.', undefined]);
  });

  it('실패가 있으면 중복도 올리지 못한 장수에 함께 센다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2', 'p3'));
    let calls = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        calls += 1;
        // 1장 추가, 1장 중복, 1장 실패
        if (calls === 1) return ok({ photoId: 7_300, result: 'STORED' });
        if (calls === 2) return ok({ photoId: 7_301, result: 'ALREADY_UPLOADED' });
        return fail(409, 'PHOTO_001');
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(lastToast()).toEqual(['1장을 추가했어요. 2장은 올리지 못했어요.', undefined]);
  });

  it('실패가 있고 추가한 사진이 없으면 중복이 있어도 실패 문구를 띄운다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    let calls = 0;
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => {
        calls += 1;
        return calls === 1
          ? ok({ photoId: 7_200, result: 'ALREADY_UPLOADED' })
          : fail(409, 'PHOTO_001');
      }),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(lastToast()).toEqual(['사진을 올리지 못했어요.', undefined]);
  });
});
