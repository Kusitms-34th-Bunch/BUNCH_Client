import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// 차단·신고는 가짜 서버 응답에 기댐(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { OtherBunch } from './OtherBunch';
import { OtherBunchFollows } from './OtherBunchFollows';
import { OtherBunchMembers } from './OtherBunchMembers';

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

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  server.events.removeAllListeners();
});

// 내 번치(여행쥬아, 명의)가 다른 번치 3·4를 팔로우한 관계(시작 데이터의 목록용 관계는 제외)
const myExternalFollows = () =>
  mockDb
    .get()
    .follows.filter(
      (follow) =>
        follow.followerBunchId === MOCK_BUNCH_ID &&
        (follow.targetBunchId === 3 || follow.targetBunchId === 4),
    );
const myBlocks = () =>
  mockDb.get().blocks.filter((block) => block.blockerBunchId === MOCK_BUNCH_ID);

const wrapper = () => createQueryWrapper(createTestQueryClient());
const renderOther = (bunchId: string) =>
  render(<OtherBunch bunchId={bunchId} />, { wrapper: wrapper() });
const openMore = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: '더보기' }));
  return screen.findByRole('dialog', { name: '더보기' });
};
const confirmBlock = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(within(await openMore(user)).getByRole('button', { name: '차단하기' }));
  const confirm = await screen.findByRole(
    'dialog',
    { name: `${name} 번치를 차단할까요?` },
    SHEET_WAIT,
  );
  await user.click(within(confirm).getByRole('button', { name: '차단하기' }));
};
const blockedTitle = () =>
  screen.findByRole('heading', { level: 1, name: '볼 수 없는 번치예요' }, SHEET_WAIT);

describe('다른 번치 차단(가짜 서버)', () => {
  it('확인 뒤 서버에 차단하고, 팔로우를 해제한 뒤 접근 제한 화면으로 바꾼다', async () => {
    const user = userEvent.setup();
    renderOther('3');

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

    const title = await blockedTitle();
    await waitFor(() => expect(title).toHaveFocus());
    expect(toast).toHaveBeenCalledWith('캠핑러버 번치를 차단했어요.');
    expect(screen.queryByRole('button', { name: /팔로우|팔로잉/ })).toBeNull();
    expect(myBlocks().map((block) => block.targetBunchId)).toContain(3);
    expect(myExternalFollows()).toEqual([]);
  });

  it('팔로우를 보내는 중에 차단해도 팔로우가 끝난 뒤 차단하고 남은 팔로우를 해제한다', async () => {
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
    const calls: string[] = [];
    server.events.on('request:start', ({ request }) => {
      const path = new URL(request.url).pathname;
      if (request.method !== 'GET') calls.push(`${request.method} ${path}`);
    });
    const user = userEvent.setup();
    renderOther('3');

    await user.click(await screen.findByRole('button', { name: '팔로우' }));
    await confirmBlock(user, '캠핑러버');
    release();

    await blockedTitle();
    // 팔로우 → 차단 → 해제 순서(차단이 실패하면 팔로우는 그대로, 서버가 이미 정리했으면 해제 404는 무시)
    await waitFor(() =>
      expect(calls).toEqual([
        `PUT /api/bunches/${MOCK_BUNCH_ID}/following/3`,
        `PUT /api/bunches/${MOCK_BUNCH_ID}/blocks/3`,
        `DELETE /api/bunches/${MOCK_BUNCH_ID}/following/3`,
      ]),
    );
    expect(toast).not.toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.followFailed);
    expect(myExternalFollows()).toEqual([]);
  });

  it('팔로우 요청 중인 비공개 번치를 차단하면 요청도 취소된다', async () => {
    const user = userEvent.setup();
    renderOther('4');

    await user.click(await screen.findByRole('button', { name: '팔로우' }));
    await screen.findByRole('button', { name: '팔로우 요청됨' });
    expect(myExternalFollows()[0]?.status).toBe('REQUESTED');

    await confirmBlock(user, '책방산책');
    await blockedTitle();
    expect(myExternalFollows()).toEqual([]);
  });

  it('차단에 실패하면 프로필과 팔로우를 그대로 두고 실패를 알린다', async () => {
    server.use(http.put('/api/bunches/:viewerId/blocks/:targetId', () => fail(500, 'X')));
    const user = userEvent.setup();
    renderOther('3');

    await user.click(await screen.findByRole('button', { name: '팔로우' }));
    await screen.findByRole('button', { name: '팔로잉' });
    await confirmBlock(user, '캠핑러버');
    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.blockFailed));
    expect(
      await screen.findByRole('heading', { level: 1, name: '캠핑러버' }, SHEET_WAIT),
    ).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalledWith('캠핑러버 번치를 차단했어요.');
    expect(myExternalFollows()).toMatchObject([{ targetBunchId: 3, status: 'FOLLOWING' }]);
  });

  it('차단하려는 사이 다른 기기에서 번치를 바꿨으면 이전 명의로 차단하지 않는다', async () => {
    const user = userEvent.setup();
    renderOther('3');
    await screen.findByRole('heading', { level: 1, name: '캠핑러버' });
    // 이 기기는 여행쥬아로 알고 있지만 서버의 지금 번치는 퇴근런클럽(2)
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.map((item) =>
        item.memberId === MOCK_MY_MEMBER_ID && item.bunchId === 2
          ? { ...item, lastUsedAt: '2026-11-01T09:00:00.000Z' }
          : item,
      ),
    }));

    await confirmBlock(user, '캠핑러버');
    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.blockFailed));
    expect(mockDb.get().blocks.some((block) => block.targetBunchId === 3)).toBe(false);
  });

  it('확인 시트의 「취소」는 차단하지 않는다', async () => {
    const user = userEvent.setup();
    renderOther('3');

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
    expect(myBlocks().map((block) => block.targetBunchId)).not.toContain(3);
    expect(toast).not.toHaveBeenCalled();
  });

  it('일반 멤버도 「차단하기」와 「신고하기」를 쓸 수 있다', async () => {
    // 내 정보의 기본 번치(여행쥬아)에서 나는 일반 멤버(기능명세 5.10.4, 차단은 멤버 누구나)
    const user = userEvent.setup();
    renderOther('3');

    const menu = await openMore(user);
    expect(within(menu).getByRole('button', { name: '차단하기' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: '신고하기' })).toBeInTheDocument();
  });

  it('이미 차단한 번치(차단 목록에 있음)는 처음부터 접근 제한 화면이다', async () => {
    // 시작 데이터: 여행쥬아가 야간러너스(10)를 차단
    renderOther('10');
    expect(await blockedTitle()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '더보기' })).toBeNull();
  });

  it('상대가 나를 차단해 서버가 403을 주면 접근 제한 화면이다', async () => {
    mockDb.update((state) => ({
      ...state,
      blocks: [
        ...state.blocks,
        {
          id: 99,
          blockerBunchId: 3,
          targetBunchId: MOCK_BUNCH_ID,
          createdAt: '2026-10-20T09:00:00.000Z',
        },
      ],
    }));
    renderOther('3');
    expect(await blockedTitle()).toBeInTheDocument();
    // 서버 응답으로만 판단해 다른 이유의 403일 수 있어 다시 시도를 둠
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('서버 렌더는 차단 여부를 몰라 프로필·목록 내용 없이 헤더만 그린다', () => {
    const Wrapper = wrapper();
    for (const html of [
      renderToString(
        <Wrapper>
          <OtherBunch bunchId="3" />
        </Wrapper>,
      ),
      renderToString(
        <Wrapper>
          <OtherBunchFollows bunchId="3" initialTab="followers" />
        </Wrapper>,
      ),
      renderToString(
        <Wrapper>
          <OtherBunchMembers bunchId="3" />
        </Wrapper>,
      ),
    ]) {
      expect(html).toContain('뒤로 가기');
      expect(html).not.toContain('캠핑러버');
      expect(html).not.toContain('<li');
      expect(html).not.toContain('role="tab"');
      expect(html).not.toContain('<h1');
    }
  });

  it('차단한 번치의 팔로워·팔로잉·멤버 목록도 접근 제한 화면이다', async () => {
    mockDb.update((state) => ({
      ...state,
      blocks: [
        ...state.blocks,
        {
          id: 99,
          blockerBunchId: MOCK_BUNCH_ID,
          targetBunchId: 3,
          createdAt: '2026-10-20T09:00:00.000Z',
        },
      ],
    }));

    const { unmount } = render(<OtherBunchFollows bunchId="3" initialTab="followers" />, {
      wrapper: wrapper(),
    });
    expect(await blockedTitle()).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    unmount();

    render(<OtherBunchMembers bunchId="3" />, { wrapper: wrapper() });
    expect(await blockedTitle()).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});

describe('다른 번치 신고(가짜 서버)', () => {
  it('사유를 골라야 신고할 수 있고, 기타는 상세 사유가 필요하며, 접수되면 안내를 띄운다', async () => {
    const user = userEvent.setup();
    renderOther('3');

    await user.click(within(await openMore(user)).getByRole('button', { name: '신고하기' }));
    const sheet = await screen.findByRole(
      'dialog',
      { name: '캠핑러버 번치를 신고할까요?' },
      SHEET_WAIT,
    );
    // 신고 명의는 내 정보의 기본 번치
    expect(sheet).toHaveTextContent('여행쥬아 계정으로 신고해요');
    const submit = within(sheet).getByRole('button', { name: '신고하기' });
    expect(submit).toBeDisabled();

    await user.click(within(sheet).getByRole('radio', { name: '기타' }));
    expect(submit).toBeDisabled();
    await user.type(within(sheet).getByRole('textbox', { name: /상세 사유/ }), '광고 계정이에요');
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '캠핑러버 번치를 신고할까요?' })).toBeNull(),
    );
    await waitFor(() => expect(toast).toHaveBeenCalledWith('신고가 접수됐어요.'));
    expect(mockDb.get().reports).toEqual([
      expect.objectContaining({
        reporterBunchId: MOCK_BUNCH_ID,
        targetBunchId: 3,
        reason: 'OTHER',
        detail: '광고 계정이에요',
      }),
    ]);
  });

  it('접수에 실패하면 접수 안내 대신 실패를 알린다', async () => {
    server.use(http.post('/api/bunches/:viewerId/reports', () => fail(500, 'X')));
    const user = userEvent.setup();
    renderOther('3');

    await user.click(within(await openMore(user)).getByRole('button', { name: '신고하기' }));
    const sheet = await screen.findByRole(
      'dialog',
      { name: '캠핑러버 번치를 신고할까요?' },
      SHEET_WAIT,
    );
    await user.click(within(sheet).getByRole('radio', { name: '스팸' }));
    await user.click(within(sheet).getByRole('button', { name: '신고하기' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.reportFailed));
    expect(toast).not.toHaveBeenCalledWith('신고가 접수됐어요.');
  });
});
