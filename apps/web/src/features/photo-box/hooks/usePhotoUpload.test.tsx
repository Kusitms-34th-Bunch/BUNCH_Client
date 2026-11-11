import type * as DesignSystem from '@app/design-system';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { photoBoxKeys } from '../queries/keys';
import { usePhotoUpload } from './usePhotoUpload';

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

    let started: Promise<void> = Promise.resolve();
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

describe('usePhotoUpload 상태 안내', () => {
  it('올리는 동안 uploading이 true이고 끝나면 false다(화면 밖 안내용)', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1'));
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
    expect(result.current.uploading).toBe(false);

    let started: Promise<void> = Promise.resolve();
    act(() => {
      started = result.current.start('album');
    });
    await waitFor(() => expect(result.current.uploading).toBe(true));

    release();
    await act(() => started);
    expect(result.current.uploading).toBe(false);
  });

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

    let started: Promise<void> = Promise.resolve();
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

    let started: Promise<void> = Promise.resolve();
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
  it('내가 이미 올린 같은 사진(ALREADY_UPLOADED)은 추가한 사진으로 세지 않는다', async () => {
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

    expect(lastToast()).toEqual(['2장의 사진을 사진함에 추가했어요.', undefined]);
  });

  it('모두 내가 이미 올린 사진이면 알릴 것이 없어 토스트를 띄우지 않는다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(pickedAlbum('p1', 'p2'));
    server.use(
      http.post('/api/bunches/:bunchId/photos', () =>
        ok({ photoId: 7_100, result: 'ALREADY_UPLOADED' }),
      ),
    );
    const { result } = render();

    await act(() => result.current.start('album'));

    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('올리지 못한 사진이 함께 있으면 제외된 사진은 빼고 알린다', async () => {
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
