import type * as DesignSystem from '@app/design-system';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftPhoto } from '@/features/bundle/lib/types';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { BUNDLE_MESSAGES } from '@/features/bundle/constants/messages';
import { PHOTO_BOX_MESSAGES } from '@/features/photo-box/constants/messages';
import { MAX_PHOTOS_IN_BOX } from '@/features/photo-box/lib/photoActions';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { usePhotoGalleryImport } from './usePhotoGalleryImport';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const bridge = vi.hoisted(() => ({
  pickGalleryImages: vi.fn(),
  capturePhoto: vi.fn(),
  readPickedPhoto: vi.fn(),
  releasePickedPhotos: vi.fn(),
  openAppSettings: vi.fn(),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  photoUploadBridge: {
    isNativeMethodAvailable: () => true,
    pickGalleryImages: bridge.pickGalleryImages,
    capturePhoto: bridge.capturePhoto,
    readPickedPhoto: bridge.readPickedPhoto,
    releasePickedPhotos: bridge.releasePickedPhotos,
    openAppSettings: bridge.openAppSettings,
  },
}));

const bunchId = String(MOCK_BUNCH_ID);

const boxPhoto = (id: string): PhotoBoxPhoto => ({
  id,
  src: `/mock/photos/${id}.jpg`,
  alt: `사진 ${id}`,
  takenAt: '2026-10-18T10:00',
  uploadedAt: '2026-10-18T10:00:00',
  uploaderIds: ['1'],
  usedInDraftBundle: false,
  status: 'ready',
});

const draftPhoto = (id: string, sourcePhotoId?: string): DraftPhoto => ({
  id,
  src: `/mock/photos/${id}.jpg`,
  alt: id,
  takenAt: null,
  uploaderId: '1',
  sourcePhotoId,
});

// 사진 id마다 다른 바이트의 JPEG(웹이 JPEG 시작 바이트를 확인함)
const imageOf = (id: string) => ({
  dataUrl: `data:image/jpeg;base64,${btoa(`${String.fromCharCode(0xff, 0xd8, 0xff, 0xe0)}${id}-${Math.random()}`)}`,
});

const picked = (...ids: string[]) => ({
  status: 'picked' as const,
  photos: ids.map((id) => ({ id })),
});

// 올릴 때마다 서버가 정해 주는 사진함 사진 id(9001부터). 실패시킬 순번은 따로 받음
const serveUploads = (failAt: number[] = []) => {
  let calls = 0;
  server.use(
    http.post('/api/bunches/:bunchId/photos', () => {
      calls += 1;
      if (failAt.includes(calls)) return fail(400, 'COMMON_001');
      return ok({ photoId: 9000 + calls, result: 'STORED' });
    }),
  );
};

const render = (options: {
  boxPhotos?: readonly PhotoBoxPhoto[];
  photos?: readonly DraftPhoto[];
}) => {
  const replacePhotos =
    vi.fn<
      (
        _photos: readonly DraftPhoto[],
        _options?: { partialAdd?: boolean | undefined },
      ) => boolean | void
    >();
  const rendered = renderHook(
    () =>
      usePhotoGalleryImport({
        bunchId,
        boxPhotos: options.boxPhotos ?? [boxPhoto('9001'), boxPhoto('9002'), boxPhoto('9003')],
        photos: options.photos ?? [draftPhoto('draft-1', '1')],
        replacePhotos,
      }),
    { wrapper: createQueryWrapper(createTestQueryClient()) },
  );
  return { ...rendered, replacePhotos };
};

beforeEach(() => {
  vi.clearAllMocks();
  bridge.readPickedPhoto.mockImplementation((id: string) => Promise.resolve(imageOf(id)));
  bridge.releasePickedPhotos.mockResolvedValue(undefined);
});

describe('usePhotoGalleryImport', () => {
  it('사진함이 가득 차면 선택창을 열지 않고 「사진함이 가득 찼어요.」만 띄운다', () => {
    const full = Array.from({ length: MAX_PHOTOS_IN_BOX }, (_, index) => boxPhoto(`b${index}`));
    const { result } = render({ boxPhotos: full });

    act(() => result.current.importFromGallery(10));

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.photoBoxFull);
    expect(bridge.pickGalleryImages).not.toHaveBeenCalled();
    expect(result.current.importing).toBeUndefined();
  });

  it('사진함 번치를 모르면 선택창을 열지 않고 일시적 오류를 안내하며 사진함을 다시 받는다', () => {
    const onUnavailable = vi.fn();
    const rendered = renderHook(
      () =>
        usePhotoGalleryImport({
          bunchId: undefined,
          boxPhotos: [],
          photos: [],
          replacePhotos: vi.fn(),
          onUnavailable,
        }),
      { wrapper: createQueryWrapper(createTestQueryClient()) },
    );

    act(() => rendered.result.current.importFromGallery(5));

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.uploadFailed);
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(bridge.pickGalleryImages).not.toHaveBeenCalled();
  });

  it('더 담을 수 없으면(0장) 선택창을 열지 않는다', () => {
    const { result } = render({});

    act(() => result.current.importFromGallery(0));

    expect(bridge.pickGalleryImages).not.toHaveBeenCalled();
  });

  it('고를 수 있는 장수를 선택창에 넘기고, 올라간 사진을 번들 맨 뒤에 붙인다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(picked('p1', 'p2'));
    serveUploads();
    const { result, replacePhotos } = render({});

    act(() => result.current.importFromGallery(5));
    // 선택창이 열려 있는 동안은 장수를 모르므로 0
    expect(result.current.importing).toBe(0);
    await waitFor(() => expect(replacePhotos).toHaveBeenCalledTimes(1));

    expect(bridge.pickGalleryImages).toHaveBeenCalledWith({ limit: 5 });
    expect(replacePhotos).toHaveBeenCalledWith(
      [
        draftPhoto('draft-1', '1'),
        expect.objectContaining({ id: 'draft-9001', sourcePhotoId: '9001' }),
        expect.objectContaining({ id: 'draft-9002', sourcePhotoId: '9002' }),
      ],
      expect.objectContaining({ partialAdd: true }),
    );
    // 모두 올라가면 결과 토스트 없이 칸에 사진이 들어옴
    expect(toast).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.importing).toBeUndefined());
  });

  it('고른 사진이 올라가는 동안은 고른 장수를 알린다', async () => {
    let release!: () => void;
    bridge.pickGalleryImages.mockResolvedValue(picked('p1', 'p2', 'p3'));
    bridge.readPickedPhoto.mockImplementation(
      (id: string) => new Promise((resolve) => (release = () => resolve(imageOf(id)))),
    );
    serveUploads();
    const { result } = render({});

    act(() => result.current.importFromGallery(5));
    await waitFor(() => expect(result.current.importing).toBe(3));

    // 읽기를 풀어 주기 전까지 가져오는 중 상태 유지, 이미 가져오는 중이면 선택창 재오픈 방지
    act(() => result.current.importFromGallery(5));
    expect(bridge.pickGalleryImages).toHaveBeenCalledTimes(1);
    // 다시 누르면 올라가는 중이라고만 알림
    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.uploading);
    release();
  });

  it('선택을 취소하면 아무것도 붙이지 않고 가져오기가 끝난다', async () => {
    bridge.pickGalleryImages.mockResolvedValue({ status: 'canceled' });
    const { result, replacePhotos } = render({});

    act(() => result.current.importFromGallery(5));

    await waitFor(() => expect(result.current.importing).toBeUndefined());
    expect(replacePhotos).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('일부를 올리지 못하면 올라간 사진만 붙이고 결과 토스트를 「다시 시도」 없이 띄운다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(picked('p1', 'p2'));
    serveUploads([2]);
    const { result, replacePhotos } = render({});

    act(() => result.current.importFromGallery(5));
    await waitFor(() => expect(replacePhotos).toHaveBeenCalledTimes(1));

    expect(replacePhotos).toHaveBeenCalledWith(
      [draftPhoto('draft-1', '1'), expect.objectContaining({ sourcePhotoId: '9001' })],
      expect.objectContaining({ partialAdd: true }),
    );
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith('1장을 추가했어요. 1장은 올리지 못했어요.', undefined);
  });

  it('번들에 붙이지 못하면(연결 끊김) 사진 구성 변경 실패 토스트를 띄운다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(picked('p1'));
    serveUploads();
    const { result, replacePhotos } = render({});
    replacePhotos.mockReturnValue(false);

    act(() => result.current.importFromGallery(5));
    await waitFor(() => expect(replacePhotos).toHaveBeenCalledTimes(1));

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photosChangeFailed);
  });

  it('올린 사진이 목록에 늦게 들어와도 목록을 다시 받아 번들에 붙인다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(picked('p1'));
    serveUploads();
    const replacePhotos =
      vi.fn<
        (
          _photos: readonly DraftPhoto[],
          _options?: { partialAdd?: boolean | undefined },
        ) => boolean | void
      >();
    const { result, rerender } = renderHook(
      ({ boxPhotos }: { boxPhotos: readonly PhotoBoxPhoto[] }) =>
        usePhotoGalleryImport({
          bunchId,
          boxPhotos,
          photos: [draftPhoto('draft-1', '1')],
          replacePhotos,
        }),
      {
        initialProps: { boxPhotos: [] as readonly PhotoBoxPhoto[] },
        wrapper: createQueryWrapper(createTestQueryClient()),
      },
    );

    act(() => result.current.importFromGallery(5));
    // 올라간 뒤에도 목록에 아직 없어 붙이지 않고 기다림
    await waitFor(() => expect(result.current.importing).toBe(1));
    expect(replacePhotos).not.toHaveBeenCalled();

    // 다시 받은 목록에 들어오면 붙임
    rerender({ boxPhotos: [boxPhoto('9001')] });
    await waitFor(() => expect(replacePhotos).toHaveBeenCalledTimes(1));
    expect(replacePhotos).toHaveBeenCalledWith(
      [draftPhoto('draft-1', '1'), expect.objectContaining({ sourcePhotoId: '9001' })],
      expect.objectContaining({ partialAdd: true }),
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it('목록을 여러 번 다시 받아도 끝내 없으면 있는 사진만 붙이고 번들에 못 붙였다고 알린다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(picked('p1', 'p2'));
    serveUploads();
    // 9001만 목록에 있고 9002는 끝내 들어오지 않음
    const { result, replacePhotos } = render({ boxPhotos: [boxPhoto('9001')] });

    act(() => result.current.importFromGallery(5));

    await waitFor(() => expect(replacePhotos).toHaveBeenCalledTimes(1), { timeout: 8000 });
    expect(replacePhotos).toHaveBeenCalledWith(
      [draftPhoto('draft-1', '1'), expect.objectContaining({ sourcePhotoId: '9001' })],
      expect.objectContaining({ partialAdd: true }),
    );
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.photosChangeFailed);
    await waitFor(() => expect(result.current.importing).toBeUndefined());
  }, 10_000);

  it('이미 번들에 있는 사진은 다시 붙이지 않고 20장을 넘지 않게 붙인다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(picked('p1', 'p2', 'p3'));
    serveUploads();
    // 이미 18장이 있고 그중 하나가 방금 올라올 사진(9001)
    const existing = [
      ...Array.from({ length: 17 }, (_, index) => draftPhoto(`draft-e${index}`, `e${index}`)),
      draftPhoto('draft-9001', '9001'),
    ];
    const { result, replacePhotos } = render({ photos: existing });

    act(() => result.current.importFromGallery(2));
    await waitFor(() => expect(replacePhotos).toHaveBeenCalledTimes(1));

    const next = replacePhotos.mock.calls[0]?.[0] as readonly DraftPhoto[];
    // 9001은 이미 있어 건너뛰고 남은 두 자리에 9002·9003만
    expect(next.map((photo) => photo.sourcePhotoId).slice(18)).toEqual(['9002', '9003']);
    expect(next).toHaveLength(20);
    expect(toast).not.toHaveBeenCalled();
  });

  // 업로드하는 동안 번들 사진이 바뀌는 상황(다른 멤버가 자리를 채움)을 만들기 위해 읽기를 붙잡아 둠
  const renderWhileUploading = (initial: readonly DraftPhoto[]) => {
    let release!: () => void;
    bridge.readPickedPhoto.mockImplementation(
      (id: string) => new Promise((resolve) => (release = () => resolve(imageOf(id)))),
    );
    const replacePhotos =
      vi.fn<
        (
          _photos: readonly DraftPhoto[],
          _options?: { partialAdd?: boolean | undefined; requested?: number | undefined },
        ) => boolean | void
      >();
    const view = renderHook(
      ({ photos }: { photos: readonly DraftPhoto[] }) =>
        usePhotoGalleryImport({
          bunchId,
          boxPhotos: [boxPhoto('9001')],
          photos,
          replacePhotos,
        }),
      {
        initialProps: { photos: initial },
        wrapper: createQueryWrapper(createTestQueryClient()),
      },
    );
    return { ...view, replacePhotos, release: () => release() };
  };
  const filled = (count: number) =>
    Array.from({ length: count }, (_, index) => draftPhoto(`draft-e${index}`, `e${index}`));

  it('올리는 사이 다른 멤버가 자리를 채워도 고른 사진을 자르지 않고 넘겨, 담을 장수와 안내는 받는 쪽이 정하게 한다(기능명세서 4.3.14)', async () => {
    bridge.pickGalleryImages.mockResolvedValue(picked('p1'));
    serveUploads();
    const { result, rerender, replacePhotos, release } = renderWhileUploading(filled(19));

    act(() => result.current.importFromGallery(1));
    await waitFor(() => expect(result.current.importing).toBe(1));
    // 올라가는 동안 20장이 됨
    rerender({ photos: filled(20) });
    release();
    await waitFor(() => expect(replacePhotos).toHaveBeenCalledTimes(1));

    const [next, options] = replacePhotos.mock.calls[0]!;
    // 붙일 때의 최신 구성(20장) 뒤에 고른 사진을 그대로 붙여 넘김(공동 편집은 서버가 남은 자리만큼 담음)
    expect(next).toHaveLength(21);
    expect(next.at(-1)?.sourcePhotoId).toBe('9001');
    expect(options).toEqual({ partialAdd: true, requested: 1 });
    // 자리 안내는 이 hook이 띄우지 않음(받는 쪽이 한 번만)
    expect(toast).not.toHaveBeenCalled();
  });

  it('올리는 사이 다른 멤버가 사진을 빼서 자리가 생기면 그 구성 뒤에 붙인다', async () => {
    bridge.pickGalleryImages.mockResolvedValue(picked('p1'));
    serveUploads();
    const { result, rerender, replacePhotos, release } = renderWhileUploading(filled(20));

    act(() => result.current.importFromGallery(1));
    await waitFor(() => expect(result.current.importing).toBe(1));
    rerender({ photos: filled(18) });
    release();
    await waitFor(() => expect(replacePhotos).toHaveBeenCalledTimes(1));

    const [next] = replacePhotos.mock.calls[0]!;
    expect(next).toHaveLength(19);
    expect(next.at(-1)?.sourcePhotoId).toBe('9001');
  });
});
