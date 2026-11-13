import type * as DesignSystem from '@app/design-system';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPhotoBoxEntry, readPhotoBoxEntry } from '@/features/bundle/lib/photoBoxEntry';
import { mockDrafts } from '@/mocks/db/drafts';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { PhotoBox } from './PhotoBox';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toastSpy = vi.fn<(..._args: ToastArgs) => void>();
// 토스트는 호출 인자를 확인하되 실제 표시도 그대로 둠
vi.mock('@app/design-system', async (importOriginal) => {
  const original = await importOriginal<typeof DesignSystem>();
  return {
    ...original,
    toast: (...args: ToastArgs) => {
      toastSpy(...args);
      return original.toast(...args);
    },
  };
});

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
// 로티 재생 라이브러리는 모양을 검증하지 않으므로 mock
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

// 쉘 bridge: 사진 올리기만 확인하므로 선택·읽기·놓기만 흉내 냄
const bridge = vi.hoisted(() => ({
  pickGalleryImages: vi.fn(),
  readPickedPhoto: vi.fn(),
  releasePickedPhotos: vi.fn(),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  photoUploadBridge: {
    isNativeMethodAvailable: () => true,
    pickGalleryImages: bridge.pickGalleryImages,
    readPickedPhoto: bridge.readPickedPhoto,
    releasePickedPhotos: bridge.releasePickedPhotos,
    openAppSettings: vi.fn(),
  },
}));

beforeEach(() => {
  clearPhotoBoxEntry();
  vi.clearAllMocks();
  bridge.pickGalleryImages.mockResolvedValue({ status: 'picked', photos: [{ id: 'p1' }] });
  // JPEG 시작 바이트(FF D8 FF)로 시작하는 작은 이미지
  bridge.readPickedPhoto.mockResolvedValue({
    dataUrl: `data:image/jpeg;base64,${btoa(`${String.fromCharCode(0xff, 0xd8, 0xff, 0xe0)}photo-box-test`)}`,
  });
  bridge.releasePickedPhotos.mockResolvedValue(undefined);
});

describe('PhotoBox 사진 올리기', () => {
  it('사진을 올리는 동안 화면을 막는 로딩 없이 사진함을 그대로 쓸 수 있다', async () => {
    // 응답을 잠시 늦춰 올리는 중 화면을 확인(undefined를 돌려주면 기본 가짜 서버 handler가 응답)
    server.use(
      http.post('/api/bunches/:bunchId/photos', async () => {
        await delay(300);
        return undefined;
      }),
    );
    const user = userEvent.setup();
    render(<PhotoBox />, { wrapper: createQueryWrapper(createTestQueryClient()) });

    await user.click(await screen.findByRole('button', { name: '사진 올리기' }));
    await user.click(await screen.findByRole('button', { name: '앨범에서 선택' }));

    // 올리는 중임을 스크린 리더에게만 알리고, 화면 전체 로딩이나 잠금은 없음
    await waitFor(() => expect(screen.getByText(PHOTO_BOX_MESSAGES.uploading)).toBeInTheDocument());
    expect(screen.queryByTestId('lottie')).toBeNull();
    expect(screen.getByRole('button', { name: '선택' }).closest('[inert]')).toBeNull();

    await waitFor(() => expect(screen.queryByText(PHOTO_BOX_MESSAGES.uploading)).toBeNull());
  });
});

describe('PhotoBox 번들 만들기 연결', () => {
  it('사진을 골라 「번들 만들기」를 확인하면 고른 사진을 넘기고 참여 멤버 고르기로 이동한다', async () => {
    const user = userEvent.setup();
    render(<PhotoBox />, { wrapper: createQueryWrapper(createTestQueryClient()) });

    // 프로필·멤버·사진 목록 요청이 끝나 사진함이 나올 때까지 기다림
    await user.click(await screen.findByRole('button', { name: '선택' }));
    const photo = screen
      .queryAllByRole('button')
      .find((button) => button.hasAttribute('aria-pressed'))!;
    fireEvent.click(photo);
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    await user.click(screen.getByRole('menuitem', { name: '번들 만들기' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '예' }));

    // 초안은 참여 멤버를 고른 뒤 그 화면에서 만듦(기능 spec 3.3.4)
    expect(router.push).toHaveBeenCalledWith('/bunch/bundles/new/members');
    expect(readPhotoBoxEntry()).toHaveLength(1);
    expect(mockDrafts()).toHaveLength(0);
  });
});

describe('PhotoBox 오류 복구', () => {
  it('사진 목록을 받지 못하면 오류 화면을 보이고 「다시 시도」로 사진함이 나온다', async () => {
    let failing = true;
    server.use(
      http.get('/api/bunches/:bunchId/photos', () =>
        failing ? fail(500, 'COMMON_500') : undefined,
      ),
    );
    const user = userEvent.setup();
    render(<PhotoBox />, { wrapper: createQueryWrapper(createTestQueryClient()) });

    const retry = await screen.findByRole('button', { name: '다시 시도' });
    failing = false;
    await user.click(retry);

    expect(await screen.findByRole('button', { name: '선택' })).toBeInTheDocument();
  });
});

describe('PhotoBox 이어 받기 실패 알림', () => {
  const photo = (photoId: number) => ({
    photoId,
    thumbnailUrl: `/mock/photos/${photoId}-thumb.jpg`,
    capturedDate: '2026-10-18',
    uploaderIds: [1],
  });

  it('첫 쪽 뒤의 쪽을 받다 실패하면 받은 사진은 그대로 두고 오류 토스트를 띄운다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/photos', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor === null) return ok({ totalCount: 2, photos: [photo(1)], nextCursor: 'p2' });
        return fail(500, 'COMMON_500');
      }),
    );
    render(<PhotoBox />, { wrapper: createQueryWrapper(createTestQueryClient()) });

    // 첫 쪽은 보이고
    expect(await screen.findByRole('button', { name: '선택' })).toBeInTheDocument();
    // 다음 쪽 실패는 토스트로 한 번 알림(화면은 오류 화면으로 바뀌지 않고, 목록 재조회 실패 안내와는 겹치지 않음)
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.listMoreFailed));
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: '선택' })).toBeInTheDocument();
  });

  it('다시 시도해도 또 실패하면 토스트를 다시 띄운다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/photos', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor === null) return ok({ totalCount: 2, photos: [photo(1)], nextCursor: 'p2' });
        return fail(500, 'COMMON_500');
      }),
    );
    const user = userEvent.setup();
    render(<PhotoBox />, { wrapper: createQueryWrapper(createTestQueryClient()) });
    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(1));

    // 키보드·스크린 리더용 재시도 버튼(재시도 중에는 로딩이 되었다가 다시 실패하면 실패 표시로 돌아옴)
    await user.click(await screen.findByRole('button', { name: '사진 더 불러오기' }));

    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(2));
  });
});
