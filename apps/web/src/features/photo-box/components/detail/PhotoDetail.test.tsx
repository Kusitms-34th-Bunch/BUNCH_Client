import type * as DesignSystem from '@app/design-system';
import type { ComponentProps, ReactElement } from 'react';
import { act, render as baseRender, screen, waitFor } from '@testing-library/react';
import { delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { PhotoDetailScreen } from './PhotoDetailScreen';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { PHOTO_BOX_PATHS } from '../../constants/paths';
import { PhotoDetail } from './PhotoDetail';

const replace = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, back, push: vi.fn() }) }));

type ScreenProps = ComponentProps<typeof PhotoDetailScreen>;
let screenProps: ScreenProps | undefined;
// 화면(스와이프 포함)은 따로 검증하므로 받은 props만 붙잡음
vi.mock('./PhotoDetailScreen', () => ({
  PhotoDetailScreen: (props: ScreenProps) => {
    screenProps = props;
    return <div data-testid="detail-screen" />;
  },
}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span /> }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 가짜 서버 시작 데이터: 시연하는 사람이 혼자 올린 사진(삭제할 수 있음)
const firstId = String(MOCK_PHOTO_IDS.S4);

const render = (ui: ReactElement) =>
  baseRender(ui, { wrapper: createQueryWrapper(createTestQueryClient()) });
// 프로필·멤버·사진 목록 요청이 끝나 화면에 데이터가 넘어갈 때까지 기다림
const loaded = () => screen.findByTestId('detail-screen');

beforeEach(() => {
  screenProps = undefined;
  vi.clearAllMocks();
});

describe('PhotoDetail', () => {
  it('있는 사진이면 사진함 순서의 사진과 멤버를 화면에 넘긴다', async () => {
    render(<PhotoDetail photoId={firstId} />);

    await loaded();
    expect(screenProps?.initialPhotoId).toBe(firstId);
    expect(screenProps?.photos).toHaveLength(13);
    expect(screenProps?.members).toHaveLength(5);
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('처음에는 썸네일을 넘기고 원본을 받으면 보는 사진을 원본으로 바꾼다', async () => {
    // 상세 응답을 잠시 늦춰 원본이 오기 전 상태를 확인(undefined를 돌려주면 기본 가짜 서버 handler가 응답)
    server.use(
      http.get('/api/bunches/:bunchId/photos/:photoId', async ({ params }) => {
        if (params.photoId === 'undated') return undefined;
        await delay(400);
        return undefined;
      }),
    );
    render(<PhotoDetail photoId={firstId} />);

    await loaded();
    const srcOf = (id: string) => screenProps?.photos.find((photo) => photo.id === id)?.src;
    expect(srcOf(firstId)).toBe('/mock/photos/S4-thumb.jpg');
    await waitFor(() => expect(srcOf(firstId)).toBe('/mock/photos/S4.jpg'));
    // 멀리 있는 사진은 아직 받지 않아 썸네일 그대로
    expect(srcOf(String(MOCK_PHOTO_IDS.O1))).toBe('/mock/photos/O1-thumb.jpg');
  });

  it('보는 중에 다른 곳에서 지워져 목록에서 사라지면 안내하고 사진함으로 이동한다', async () => {
    const client = createTestQueryClient();
    baseRender(<PhotoDetail photoId={firstId} />, { wrapper: createQueryWrapper(client) });
    await loaded();
    expect(replace).not.toHaveBeenCalled();

    // 다른 멤버가 지운 것처럼 서버 사진을 없애고 목록을 다시 받게 함
    mockDb.update((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.photoId !== MOCK_PHOTO_IDS.S4),
    }));
    await act(() => client.invalidateQueries({ queryKey: ['photo-box', 'photos'] }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list));
    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
  });

  it('없는 사진이면 「삭제된 사진이에요」 토스트 뒤 사진함으로 이동한다', async () => {
    render(<PhotoDetail photoId="9999" />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list));
    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
    expect(screenProps).toBeUndefined();
  });

  it('목록에는 있는데 상세가 없다고 오면 「삭제된 사진이에요」 안내 뒤 사진함으로 이동한다', async () => {
    server.use(
      // undated 목록 경로도 같은 패턴에 맞으므로 그 요청은 다음 handler에 넘김
      http.get('/api/bunches/:bunchId/photos/:photoId', ({ params }) =>
        params.photoId === 'undated' ? undefined : fail(404, 'RESOURCE_001'),
      ),
    );
    render(<PhotoDetail photoId={firstId} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list));
    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
  });

  it('번치를 불러오지 못하면 로딩에 머물지 않고 사진함으로 이동한다', async () => {
    mockDb.update((current) => ({ ...current, memberships: [] }));
    render(<PhotoDetail photoId={firstId} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list));
    expect(screenProps).toBeUndefined();
  });

  it('형식이 틀린 id(undefined)도 같은 안내와 이동으로 처리한다', async () => {
    render(<PhotoDetail photoId={undefined} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list));
    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
  });

  it('사진이 사라지게 삭제하면 사진함으로 이동한다', async () => {
    render(<PhotoDetail photoId={firstId} />);
    await loaded();

    screenProps?.onLeave();

    expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list);
  });

  it('화면에서 사진을 삭제해 목록에서 사라져도 「삭제된 사진이에요」 안내와 이동을 따로 하지 않는다', async () => {
    render(<PhotoDetail photoId={firstId} />);
    await loaded();

    let removedCount = 0;
    await act(async () => {
      removedCount = (await screenProps?.actions.deletePhotos([firstId]))?.removedCount ?? 0;
    });

    expect(removedCount).toBe(1);
    // 사진이 목록에서 빠져도 로딩 화면으로 바뀌지 않고 마지막 화면을 유지
    expect(screen.getByTestId('detail-screen')).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('뒤로가기는 돌아갈 기록이 있으면 back, 직접 열었으면 사진함으로 이동한다', async () => {
    render(<PhotoDetail photoId={firstId} />);
    await loaded();

    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    screenProps?.onBack();
    expect(back).toHaveBeenCalledTimes(1);

    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    screenProps?.onBack();
    expect(replace).toHaveBeenCalledWith(PHOTO_BOX_PATHS.list);
    vi.restoreAllMocks();
  });

  it('사진을 넘기면 Next 이동 없이 주소만 현재 사진으로 바꾸고 history.state는 지우지 않는다', async () => {
    window.history.replaceState({ __NA: true }, '', '/');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    render(<PhotoDetail photoId={firstId} />);
    await loaded();

    screenProps?.onPhotoChange?.('7');

    expect(replaceState).toHaveBeenCalledWith({ __NA: true }, '', PHOTO_BOX_PATHS.detail('7'));
    expect(replace).not.toHaveBeenCalled();
    replaceState.mockRestore();
    window.history.replaceState(null, '', '/');
  });
});
