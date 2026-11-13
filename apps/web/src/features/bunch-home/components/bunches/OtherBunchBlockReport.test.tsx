import type * as DesignSystem from '@app/design-system';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { renderToString } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
// 다른 번치 프로필은 가짜 서버 응답에 기댐(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { mockDb } from '@/mocks/db';
import { server } from '@/mocks/server';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 메뉴 시트가 다 닫힌 뒤 다음 시트가 열려(닫힘 애니메이션) 부하가 큰 전체 실행에서는 기본 1초보다 오래 걸릴 수 있음
const SHEET_WAIT = { timeout: 3000 };

const useBunch = (bunchId: string) =>
  sessionStorage.setItem('bunch-home:current-bunch-id', bunchId);

// 첫 테스트가 화면 모듈 전체의 첫 변환 비용을 떠안아 부하가 큰 전체 실행에서 5초 제한을 넘던 것 방지(변환 결과는 resetModules 뒤에도 재사용)
beforeAll(async () => {
  await import('./OtherBunch');
});

// 차단·팔로우 결과는 모듈 저장소에 남으므로 테스트마다 모듈을 새로 불러 처음 상태로
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  sessionStorage.clear();
});

// 프로필은 가짜 서버 데이터라 QueryClient와 함께 그림. resetModules 뒤라 같은 TanStack Query 모듈을 쓰게 함께 불러옴
const queryWrapper = async () => {
  const { createQueryWrapper, createTestQueryClient } = await import('@/shared/query/testing');
  return createQueryWrapper(createTestQueryClient());
};
const renderOther = async (bunchId: string) => {
  const { OtherBunch } = await import('./OtherBunch');
  return render(<OtherBunch bunchId={bunchId} />, { wrapper: await queryWrapper() });
};

const openMore = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: '더보기' }));
  return screen.findByRole('dialog', { name: '더보기' });
};

describe('다른 번치 차단', () => {
  it('확인 뒤 차단하고, 프로필 대신 접근 제한 화면과 차단 목록에 반영된다', async () => {
    // 퇴근런클럽: 메인 관리자
    useBunch('bunch-run');
    const user = userEvent.setup();
    const { useBlockedBunches } = await import('../../hooks/useBlockedBunches');
    await renderOther('3');

    // 팔로우 중이던 번치를 차단하면 팔로우도 해제
    await user.click(await screen.findByRole('button', { name: '팔로우' }));
    await screen.findByRole('button', { name: '팔로잉' });
    await user.click(within(await openMore(user)).getByRole('button', { name: '차단하기' }));
    const confirm = await screen.findByRole(
      'dialog',
      { name: '캠핑러버 번치를 차단할까요?' },
      SHEET_WAIT,
    );
    expect(confirm).toHaveTextContent('차단하면 번치의 모든 멤버가');
    await user.click(within(confirm).getByRole('button', { name: '차단하기' }));

    expect(toast).toHaveBeenCalledWith('캠핑러버 번치를 차단했어요.');
    const title = await screen.findByRole('heading', { level: 1, name: '볼 수 없는 번치예요' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.queryByRole('button', { name: /팔로우|팔로잉/ })).toBeNull();

    const { result: blocked } = renderHook(() => useBlockedBunches('bunch-run'));
    expect(blocked.current.blocked?.[0]).toMatchObject({ id: '3', name: '캠핑러버' });
    await waitFor(() => expect(mockDb.get().follows).toEqual([]));
  });

  it('팔로우를 보내는 중에 차단해도 끝난 뒤 팔로우를 해제한다', async () => {
    useBunch('bunch-run');
    // 차단을 누른 뒤에야 팔로우 응답이 가게 막아 둠(아무것도 돌려주지 않으면 원래 handler가 처리)
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.put('/api/bunches/:viewerId/following/:targetId', async () => {
        await gate;
      }),
    );
    const deletes: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'DELETE') deletes.push(new URL(request.url).pathname);
    });
    const user = userEvent.setup();
    await renderOther('3');

    await user.click(await screen.findByRole('button', { name: '팔로우' }));
    await user.click(within(await openMore(user)).getByRole('button', { name: '차단하기' }));
    const confirm = await screen.findByRole(
      'dialog',
      { name: '캠핑러버 번치를 차단할까요?' },
      SHEET_WAIT,
    );
    await user.click(within(confirm).getByRole('button', { name: '차단하기' }));
    release();

    await waitFor(() => expect(deletes).toHaveLength(1), SHEET_WAIT);
    await waitFor(() => expect(mockDb.get().follows).toEqual([]), SHEET_WAIT);
    server.events.removeAllListeners();
  });

  it('확인 시트의 「취소」는 차단하지 않는다', async () => {
    useBunch('bunch-run');
    const user = userEvent.setup();
    await renderOther('3');

    await user.click(within(await openMore(user)).getByRole('button', { name: '차단하기' }));
    const confirm = await screen.findByRole(
      'dialog',
      { name: '캠핑러버 번치를 차단할까요?' },
      SHEET_WAIT,
    );
    await user.click(within(confirm).getByRole('button', { name: '취소' }));

    // 시트가 닫히는 동안 뒤 화면은 접근성 트리에서 숨겨져 있어 닫힌 뒤를 기다림
    expect(
      await screen.findByRole('heading', { level: 1, name: '캠핑러버' }, SHEET_WAIT),
    ).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('일반 멤버도 「차단하기」와 「신고하기」를 쓸 수 있다', async () => {
    // 큐시즘 기프: 일반 멤버(기능명세 5.10.4, 차단은 멤버 누구나)
    useBunch('bunch-gift');
    const user = userEvent.setup();
    await renderOther('3');

    const menu = await openMore(user);
    expect(within(menu).getByRole('button', { name: '차단하기' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: '신고하기' })).toBeInTheDocument();
  });

  it('팔로우 요청 중인 비공개 번치를 차단하면 요청도 취소된다', async () => {
    useBunch('bunch-run');
    const user = userEvent.setup();
    await renderOther('4');

    await user.click(await screen.findByRole('button', { name: '팔로우' }));
    await screen.findByRole('button', { name: '팔로우 요청됨' });
    expect(mockDb.get().follows[0]?.status).toBe('REQUESTED');

    await user.click(within(await openMore(user)).getByRole('button', { name: '차단하기' }));
    const confirm = await screen.findByRole(
      'dialog',
      { name: '책방산책 번치를 차단할까요?' },
      SHEET_WAIT,
    );
    await user.click(within(confirm).getByRole('button', { name: '차단하기' }));

    await waitFor(() => expect(mockDb.get().follows).toEqual([]));
  });

  it('차단을 해제하면 프로필이 다시 보인다', async () => {
    useBunch('bunch-run');
    const { OtherBunch } = await import('./OtherBunch');
    const { useBlockedBunches } = await import('../../hooks/useBlockedBunches');
    const { result } = renderHook(() => useBlockedBunches('bunch-run'));
    act(() => result.current.block({ id: '3', name: '캠핑러버' }));
    render(<OtherBunch bunchId="3" />, { wrapper: await queryWrapper() });
    expect(
      await screen.findByRole('heading', { level: 1, name: '볼 수 없는 번치예요' }),
    ).toBeInTheDocument();

    act(() => result.current.unblock('3'));
    expect(await screen.findByRole('heading', { level: 1, name: '캠핑러버' })).toBeInTheDocument();
  });

  it('서버 렌더는 차단 여부를 몰라 프로필 내용 없이 헤더만 그린다', async () => {
    useBunch('bunch-run');
    const { OtherBunch } = await import('./OtherBunch');
    const Wrapper = await queryWrapper();
    const html = renderToString(
      <Wrapper>
        <OtherBunch bunchId="3" />
      </Wrapper>,
    );

    expect(html).toContain('뒤로 가기');
    expect(html).not.toContain('캠핑러버');
    expect(html).not.toContain('더보기');
    expect(html).not.toContain('<h1');
  });

  it('팔로워·팔로잉·멤버 목록도 서버 렌더에서는 목록 없이 헤더만 그린다', async () => {
    useBunch('bunch-run');
    const { OtherBunchFollows } = await import('./OtherBunchFollows');
    const { OtherBunchMembers } = await import('./OtherBunchMembers');

    for (const html of [
      renderToString(<OtherBunchFollows bunchId="3" initialTab="followers" />),
      renderToString(<OtherBunchMembers bunchId="3" />),
    ]) {
      expect(html).toContain('뒤로 가기');
      expect(html).not.toContain('<li');
      expect(html).not.toContain('role="tab"');
    }
  });

  it('차단한 번치의 팔로워·팔로잉·멤버 목록도 접근 제한 화면이다', async () => {
    useBunch('bunch-run');
    const { useBlockedBunches } = await import('../../hooks/useBlockedBunches');
    const { OtherBunchFollows } = await import('./OtherBunchFollows');
    const { OtherBunchMembers } = await import('./OtherBunchMembers');
    const { result } = renderHook(() => useBlockedBunches('bunch-run'));
    result.current.block({ id: '3', name: '캠핑러버' });

    const { unmount } = render(<OtherBunchFollows bunchId="3" initialTab="followers" />);
    expect(
      screen.getByRole('heading', { level: 1, name: '볼 수 없는 번치예요' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    unmount();

    render(<OtherBunchMembers bunchId="3" />);
    expect(
      screen.getByRole('heading', { level: 1, name: '볼 수 없는 번치예요' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});

describe('다른 번치 신고', () => {
  it('사유를 골라야 신고할 수 있고, 기타는 상세 사유가 필요하며, 신고하면 접수 안내를 띄운다', async () => {
    useBunch('bunch-gift');
    const user = userEvent.setup();
    await renderOther('3');

    await user.click(within(await openMore(user)).getByRole('button', { name: '신고하기' }));
    const sheet = await screen.findByRole(
      'dialog',
      { name: '캠핑러버 번치를 신고할까요?' },
      SHEET_WAIT,
    );
    expect(sheet).toHaveTextContent('큐시즘 기프 계정으로 신고해요');
    const submit = within(sheet).getByRole('button', { name: '신고하기' });
    expect(submit).toBeDisabled();

    await user.click(within(sheet).getByRole('radio', { name: '기타' }));
    expect(submit).toBeDisabled();
    await user.type(within(sheet).getByRole('textbox', { name: /상세 사유/ }), '광고 계정이에요');
    expect(submit).toBeEnabled();

    await user.click(within(sheet).getByRole('radio', { name: '스팸' }));
    await user.click(submit);
    // 접수 안내는 시트가 다 닫힌 뒤(jsdom은 닫힘 애니메이션이 없어 순서만 확인)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '캠핑러버 번치를 신고할까요?' })).toBeNull(),
    );
    await waitFor(() => expect(toast).toHaveBeenCalledWith('신고가 접수됐어요.'));
  });
});
