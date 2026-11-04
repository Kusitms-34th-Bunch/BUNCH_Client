import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BunchHome } from './BunchHome';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

beforeEach(() => {
  push.mockClear();
  sessionStorage.clear();
});

const renderHome = () => {
  const client = createTestQueryClient();
  render(<BunchHome />, { wrapper: createQueryWrapper(client) });
  return client;
};

// 서버(가짜 서버) 데이터로 번치 홈을 그리는 흐름: 프로필·개수·완성된 번들
describe('BunchHome 서버 데이터', () => {
  it('불러오는 동안은 로딩, 끝나면 내 기본 번치의 프로필과 기존 완성된 번들을 보인다', async () => {
    renderHome();
    expect(screen.queryByRole('heading', { name: '여행쥬아' })).toBeNull();

    expect(await screen.findByRole('heading', { name: /여행쥬아/ })).toBeInTheDocument();
    expect(screen.getByText('여행 안 갈 바엔 죽을란다')).toBeInTheDocument();
    // 기존 발행 번들 2개가 발행 최신순으로 보임
    const first = await screen.findByAltText(/강릉 커피 투어/);
    const second = await screen.findByAltText(/망원 한강 피크닉/);
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('새로 발행한 번들은 기존 번들보다 앞에 보인다(발행 뒤 번치 홈 key를 무효화하면)', async () => {
    const client = renderHome();
    await screen.findByAltText(/강릉 커피 투어/);

    // 내가 새 번들을 발행한 상황: 서버에 최신 발행본이 생기고 번치 홈 데이터 전체가 무효화됨
    mockDb.update((current) => ({
      ...current,
      bundles: [
        ...current.bundles,
        {
          ...current.bundles[0]!,
          id: 9,
          title: '속초 첫째 날 🌊',
          publishedAt: '2026-11-04T09:00:00.000Z',
          updatedAt: '2026-11-04T09:00:00.000Z',
        },
      ],
    }));
    await act(() => client.invalidateQueries({ queryKey: sharedKeys.bunchHomeScope('1') }));

    const added = await screen.findByAltText(/속초 첫째 날/);
    const existing = screen.getByAltText(/강릉 커피 투어/);
    expect(added.compareDocumentPosition(existing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('불러오지 못하면 오류 화면을 보이고 「다시 시도」로 번치 홈이 나온다', async () => {
    let failing = true;
    server.use(
      http.get('/api/bunches/:bunchId/home', () => (failing ? fail(500, 'COMMON_500') : undefined)),
    );
    renderHome();

    const retry = await screen.findByRole('button', { name: '다시 시도' });
    failing = false;
    await userEvent.click(retry);

    expect(await screen.findByRole('heading', { name: /여행쥬아/ })).toBeInTheDocument();
  });

  it('소속 번치가 없으면 번치 없음 화면이다', async () => {
    mockDb.update((current) => ({ ...current, memberships: [] }));
    renderHome();

    await waitFor(() => expect(screen.queryByRole('heading', { name: /여행쥬아/ })).toBeNull());
    expect(await screen.findByRole('button', { name: /번치 (만들기|생성)/ })).toBeInTheDocument();
  });
});
