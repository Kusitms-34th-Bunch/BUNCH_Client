import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDrafts } from '@/mocks/db/drafts';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { PhotoBox } from './PhotoBox';

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
// 로티 재생 라이브러리는 모양을 검증하지 않으므로 mock
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PhotoBox 번들 만들기 연결', () => {
  it('사진을 골라 「번들 만들기」를 확인하면 로딩을 보이고 초안을 만든 뒤 작성 화면으로 이동한다', async () => {
    // 응답을 잠시 늦춰 생성 중 화면을 확인(undefined를 돌려주면 기본 가짜 서버 handler가 응답)
    server.use(
      http.post('/api/bunches/:bunchId/bundles', async () => {
        await delay(300);
        return undefined;
      }),
    );
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

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText(PHOTO_BOX_MESSAGES.bundleCreating)).toBeInTheDocument();
    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
    const [bundle] = mockDrafts();
    expect(router.push).toHaveBeenCalledWith(`/bunch/drafts/${bundle?.id}`);
    // 고른 사진 한 장으로 초안이 만들어짐(어느 사진인지는 사진함 정렬 순서에 따름)
    expect(bundle?.photos).toHaveLength(1);
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
