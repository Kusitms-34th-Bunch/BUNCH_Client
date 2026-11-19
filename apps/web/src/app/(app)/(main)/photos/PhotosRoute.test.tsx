import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPhotoBoxEntry } from '@/features/bundle/lib/photoBoxEntry';
import { clearPhotoBoxSelection } from '@/features/photo-box/lib/selectionResume';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { PhotosRoute } from './PhotosRoute';

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
// 토스트 표시는 DS의 `toast()` 담당이라 호출 인자만 확인
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));
// 사진 상세 슬라이드 라이브러리는 이 테스트와 관계없어 mock
vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('swiper/modules', () => ({ A11y: {}, Keyboard: {}, Zoom: {} }));
vi.mock('swiper/css', () => ({}));
vi.mock('swiper/css/zoom', () => ({}));

describe('PhotosRoute 번치 전환', () => {
  it('사진함 헤더의 번치 이름을 누르면 번치 전환 시트가 열리고, 다른 번치를 고르면 그 번치의 사진함으로 바뀐다', async () => {
    const user = userEvent.setup();
    render(<PhotosRoute />, { wrapper: createQueryWrapper(createTestQueryClient()) });

    await user.click(await screen.findByRole('button', { name: /여행쥬아/ }));
    const sheet = await screen.findByRole('dialog', { name: '번치 전환하기' });
    await user.click(await within(sheet).findByRole('button', { name: /퇴근런클럽/ }));

    // 기본 번치가 바뀌어 사진함 헤더도 새 번치 이름을 보임
    expect(await screen.findByRole('button', { name: /퇴근런클럽/ })).toBeInTheDocument();
    await waitFor(() => expect(toast).toHaveBeenCalledWith('퇴근런클럽 번치로 전환했어요.'));
  });
});

// 선택 모드 「번들 만들기」 진입 확인(기능명세 3.3.4 상세 동작 1, 4.1.1과 같음): route가 번들 만들기의 확인을 조합
describe('PhotosRoute 번들 만들기 진입', () => {
  beforeEach(() => {
    // 앞 테스트가 「번들 만들기」로 들어가며 기억한 선택이 다음 화면을 선택 모드로 시작하지 않게 비움
    clearPhotoBoxEntry();
    clearPhotoBoxSelection();
    router.push.mockClear();
    toast.mockClear();
  });

  // 사진 하나를 골라 메뉴를 열고, 「번들 만들기」를 누르는 함수를 돌려줌(그 사이 서버 상태를 바꿀 수 있게)
  const pickOne = async () => {
    const user = userEvent.setup();
    render(<PhotosRoute />, { wrapper: createQueryWrapper(createTestQueryClient()) });
    await user.click(await screen.findByRole('button', { name: '선택' }));
    const photo = screen
      .queryAllByRole('button')
      .find((button) => button.hasAttribute('aria-pressed'))!;
    fireEvent.click(photo);
    await user.click(screen.getByRole('button', { name: '메뉴 열기' }));
    return () => user.click(screen.getByRole('menuitem', { name: '번들 만들기' }));
  };

  it('멤버가 2명 이상이고 초안이 10개 미만이면 참여 멤버 고르기로 간다', async () => {
    const create = await pickOne();
    await create();

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/bunch/bundles/new/members'));
  });

  it('번치 멤버가 나 혼자면 이동하지 않고 「함께할 멤버가 없어요」 창을 띄운다', async () => {
    const create = await pickOne();
    // 사진함이 나온 뒤 다른 멤버가 모두 나간 상황(들어가기 직전에 새로 받음)
    server.use(
      http.get('/api/bunches/:bunchId/members', () =>
        ok([{ memberId: 5, nickname: '큐시즘', imageUrl: null, role: 'OWNER' }]),
      ),
    );
    await create();

    expect(await screen.findByRole('alertdialog', { name: '함께할 멤버가 없어요' })).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('작성 중인 번들이 이미 10개면 이동하지 않고 한도를 알린다', async () => {
    const create = await pickOne();
    server.use(
      http.get('/api/bunches/:bunchId/bundles', () =>
        ok({ items: [], page: 0, size: 1, total: 10 }),
      ),
    );
    await create();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('번들 초안은 최대 10개까지 만들 수 있어요.'),
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});
