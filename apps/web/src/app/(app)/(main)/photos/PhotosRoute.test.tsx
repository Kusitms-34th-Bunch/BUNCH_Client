import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
