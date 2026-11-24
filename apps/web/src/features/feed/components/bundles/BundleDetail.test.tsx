import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/profile/bunchProfile';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { BundleBunchSource, BundleDetailResponse } from '../../model/bundleDetail';
import { feedKeys } from '../../queries/keys';
import { BundleDetail } from './BundleDetail';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/navigation/toastAfterNavigation', () => ({ toastAfterNavigation }));

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
const toast = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back, replace }),
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

const links = { bunchHome: '/bunch', otherBunch: (id: string) => `/bunches/${id}` };

// 발행 번들 상세 응답(Swagger BunchPublicBundleDetail)
const person = (memberId: number, nickname: string, available = true) => ({
  memberId,
  nickname: available ? nickname : '작성자',
  imageUrl: null,
  profileAvailable: available,
});
const LONG_COMMENT =
  '퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! 하루 종일 책상 앞에 앉아 있다가 밖으로 나오니 선선한 바람부터 기분 좋게 느껴졌다.';
const pickers = (count: number) =>
  Array.from({ length: count }, (_, index) => person(index + 10, `멤버 ${index + 1}`));
const base = {
  date: '2026-07-09',
  publishedAt: new Date(Date.now() - 48 * 3_600_000).toISOString(),
  locations: [] as BundleDetailResponse['locations'],
  visibility: 'PUBLIC' as const,
  likeCount: 4,
  likedByCurrentBunch: false,
  commentCount: 0,
};
const MANAGE = { canEdit: true, canDelete: true, canReport: false };
const REPORT = { canEdit: false, canDelete: false, canReport: true };
const photos = (picks: number[]) =>
  picks.map((count, index) => ({
    id: index + 1,
    imageUrl: `/mock/photos/P${index + 1}.webp`,
    position: index,
    picks: { members: pickers(count) },
  }));

// 1: 우리 번치(1) 번들, 메인 관리자, 멤버 공개·댓글 수 4 / 2: 비공개 번치(4) 번들, 첫 멤버는 나감 / 3: 공개 번치(3) 번들
const DETAILS: Record<string, BundleDetailResponse> = {
  '1': {
    ...base,
    id: 1,
    bunchId: 1,
    title: '제주 3박4일 여행 아카이빙',
    photos: photos([8, 2, 1, 0]),
    locations: [
      { id: 11, name: '애월 한담해변', address: '제주시 애월읍', position: 0 },
      { id: 12, name: '한라산', address: null, position: 1 },
    ],
    contributors: [...[1, 2, 3, 4, 5, 6].map((n) => person(n, `멤버 ${n}`)), person(7, '', false)],
    comments: [
      { ...person(1, '은우'), id: 101, content: LONG_COMMENT },
      { ...person(2, '경진'), id: 102, content: '바다 보면서 먹은 갈치조림이 최고였어요.' },
      { ...person(3, '수인'), id: 103, content: '다음에는 우도까지 가 봐요!' },
      { ...person(4, '', false), id: 104, content: '삭제된 코멘트입니다' },
    ],
    visibility: 'PRIVATE',
    permissions: MANAGE,
    likedByCurrentBunch: true,
    commentCount: 4,
  },
  '2': {
    ...base,
    id: 2,
    bunchId: 4,
    title: '노을 지는 동네 책방 투어',
    photos: photos([0]),
    contributors: [person(8, '', false), person(1, '멤버 1'), person(2, '멤버 2')],
    comments: [],
    permissions: REPORT,
  },
  '3': {
    ...base,
    id: 3,
    bunchId: 3,
    title: '여름밤 바닷가 캠핑',
    photos: photos([0]),
    contributors: [person(1, '멤버 1')],
    comments: [],
    permissions: REPORT,
  },
  // 가짜 서버에 댓글이 있는 「가평 첫 캠핑」(공개 번치 3)
  '901': {
    ...base,
    id: 901,
    bunchId: 3,
    title: '가평 첫 캠핑',
    photos: photos([0]),
    contributors: [person(1, '멤버 1')],
    comments: [],
    permissions: REPORT,
    commentCount: 4,
  },
};
const BUNCHES: Record<string, BundleBunchSource> = {
  '1': { id: 1, name: '여행가조', characterType: 'TYPE_3' },
  '3': { id: 3, name: '캠핑러버', characterType: 'TYPE_2' },
  '4': { id: 4, name: '책방산책', characterType: 'TYPE_1' },
};

type RenderOptions = {
  viewer?: { id: string; name: string } | null;
  focusComments?: boolean;
  showComments?: boolean;
  targetCommentId?: string;
  instantComment?: boolean;
};

/** 상세 응답을 캐시에 넣고 그림. 없는 번들 ID는 서버 응답(404)을 기다림 */
const renderDetail = (
  bundleId = '1',
  {
    viewer = { id: '1', name: '여행가조' },
    focusComments = false,
    showComments = false,
    targetCommentId,
    instantComment,
  }: RenderOptions = {},
) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: viewer });
  const detail = DETAILS[bundleId];
  const bunchId = String(detail?.bunchId ?? 1);
  if (detail) {
    client.setQueryData(feedKeys.detail(bunchId, bundleId, viewer?.id ?? null), detail);
  }
  return render(
    <BundleDetail
      bunchId={bunchId}
      bundleId={bundleId}
      bunch={BUNCHES[bunchId]}
      focusComments={focusComments}
      showComments={showComments}
      targetCommentId={targetCommentId}
      instantComment={instantComment}
      links={links}
    />,
    { wrapper: createQueryWrapper(client) },
  );
};

/** 입력란에 댓글을 써서 등록하고 목록에 붙을 때까지 기다림(가짜 서버, 작성자는 시연 회원 「큐시즘」) */
const addComment = async (user: ReturnType<typeof userEvent.setup>, content: string) => {
  await user.type(screen.getByRole('textbox', { name: /달기/ }), content);
  await user.click(screen.getByRole('button', { name: '보내기' }));
  await within(screen.getByRole('region', { name: '댓글' })).findByText(content);
};

// 목록 끝 감지 요소가 관찰되면 바로 보인 것으로 알림(이어 받기, 피드 테스트와 같은 방식)
class VisibleObserver {
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
/** 「가평 첫 캠핑」(901)에 원댓글을 더해 두 쪽(20개 넘게)으로 만듦. 가장 오래된 것은 「오래된 댓글 1」 */
const seedManyComments = (count: number) =>
  mockDb.update((state) => ({
    ...state,
    socialComments: [
      ...state.socialComments,
      ...Array.from({ length: count }, (_, index) => ({
        id: 6000 + index,
        bundleId: 901,
        parentId: null,
        memberId: 1,
        bunchId: 3,
        content: `오래된 댓글 ${index + 1}`,
        createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
        deleted: false,
      })),
    ],
  }));

afterEach(() => vi.unstubAllGlobals());

beforeEach(() => {
  toastAfterNavigation.mockClear();
  push.mockClear();
  back.mockClear();
  replace.mockClear();
  toast.mockClear();
});

/** 댓글 등록 응답을 테스트가 풀어 줄 때까지 막고, 풀면 원래 handler로 넘김(돌려준 함수로 풂) */
const holdCommentPost = () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(http.post('/api/bundles/:bundleId/comments', () => gate));
  return () => release();
};

/** 댓글 영역을 본문 500px 아래에 두고 본문이 그만큼 내려갈 수 있게 함(happy-dom은 배치를 계산하지 않음) */
const placeComments = (section: HTMLElement) => {
  vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);
  const main = section.closest('main');
  if (main) Object.defineProperty(main, 'scrollHeight', { value: 2000, configurable: true });
};

describe('BundleDetail', () => {
  it('위치와 참여 멤버를 누르면 각 시트가 열린다', async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole('button', { name: /^위치/ }));
    expect(await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(screen.getByText('애월 한담해변')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull(),
    );

    await user.click(screen.getByRole('button', { name: /^참여 멤버 \d+명/ }));
    const sheet = await screen.findByRole('dialog', { name: '참여 멤버' });
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(7);
    expect(within(sheet).getByText('작성자')).toBeTruthy();
  });

  it('나간 멤버의 얼굴은 원래 이미지 대신 기본 이미지다', () => {
    renderDetail('2');

    const first = screen.getByRole('button', { name: /^참여 멤버 3명/ }).querySelector('img');
    expect(first?.getAttribute('src')).toBe(DEFAULT_PROFILE_IMAGE);
  });

  it('제목·멤버 공개 뱃지·사진·장소·날짜를 보여 주고, 입력란에 지금 번치 이름이 들어간다', () => {
    renderDetail();

    expect(
      screen.getByRole('heading', { level: 1, name: '제주 3박4일 여행 아카이빙' }),
    ).toBeTruthy();
    expect(screen.getByRole('img', { name: '멤버 공개' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '1 / 4' })).toBeTruthy();
    // 셋째 사진은 pick 1명이라 버튼이 아님
    expect(screen.getAllByRole('button', { name: /^pick / })).toHaveLength(2);
    expect(screen.getByRole('img', { name: /^pick / })).toBeTruthy();
    expect(screen.getByText('애월 한담해변 외 1곳')).toBeTruthy();
    expect(screen.getByText('2026년 7월 9일')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: '여행가조로 댓글 달기' })).toBeTruthy();
  });

  it('멤버 칩을 고르면 그 멤버의 코멘트, 나간 멤버는 「작성자」와 삭제 안내', async () => {
    const user = userEvent.setup();
    renderDetail();
    const region = within(screen.getByRole('region', { name: '멤버별 코멘트' }));

    expect(region.getByRole('button', { name: '은우' })).toHaveAttribute('aria-pressed', 'true');
    expect(region.getByText(/퇴근하고 뛰는 게/)).toBeTruthy();

    await user.click(region.getByRole('button', { name: '경진' }));
    expect(region.getByText(/갈치조림/)).toBeTruthy();
    expect(region.queryByText(/퇴근하고 뛰는 게/)).toBeNull();

    const leftChip = region.getByRole('button', { name: '작성자' });
    expect(leftChip.querySelector('img')?.getAttribute('src')).toBe(DEFAULT_PROFILE_IMAGE);
    await user.click(leftChip);
    expect(region.getByText('삭제된 코멘트입니다')).toBeTruthy();
  });

  it('번치를 누르면 지금 번치면 번치 탭, 아니면 다른 번치 프로필로 간다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole('button', { name: /여행가조/ }));
    expect(push).toHaveBeenLastCalledWith('/bunch');
  });

  it('번치로 갈 때 상세 틀의 전환 id를 drill용으로 바꾸고, 이 화면에 남은 채 다음 입력이 오면 되돌린다', async () => {
    const user = userEvent.setup();
    const { container } = renderDetail();
    container.setAttribute('data-ssgoi-transition', '/bundles/detail');
    await user.click(screen.getByRole('button', { name: /여행가조/ }));
    expect(container.getAttribute('data-ssgoi-transition')).toBe('/bundles/detail/to-bunch');
    fireEvent.pointerDown(document.body);
    expect(container.getAttribute('data-ssgoi-transition')).toBe('/bundles/detail');
  });

  it('댓글 작성자의 프로필을 누르면 그 멤버 프로필 화면으로 간다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await addComment(user, '프로필 보러 가기');
    const comments = within(screen.getByRole('region', { name: '댓글' }));
    await user.click(comments.getByRole('button', { name: '큐시즘 프로필 보기' }));
    expect(push).toHaveBeenLastCalledWith(expect.stringMatching(/^\/members\/\d+$/));
  });

  it('다른 번치의 번들에서 번치를 누르면 다른 번치 프로필로 간다', async () => {
    const user = userEvent.setup();
    renderDetail('2');
    await user.click(screen.getByRole('button', { name: /책방산책/ }));
    expect(push).toHaveBeenLastCalledWith('/bunches/4');
  });

  it('답글을 누르면 답글 작성 상태가 되고 닫기로 돌아온다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await addComment(user, '내 댓글');

    await user.click(screen.getByRole('button', { name: /댓글에 답글 달기/ }));
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
    expect(
      screen.getByRole('textbox', { name: /큐시즘님에게 답글, 여행가조로 답글 달기/ }),
    ).toBeTruthy();

    // 닫기는 답글 상태만 풀고 키보드를 띄우지 않게 입력란이 아닌 입력 영역 틀로 초점을 옮김
    await user.click(screen.getByRole('button', { name: '답글 그만 쓰기' }));
    expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull();
    expect(document.activeElement).not.toBe(screen.getByRole('textbox'));
    expect(document.activeElement).toContainElement(screen.getByRole('textbox'));
  });

  it('입력란 밖을 눌러 키보드가 닫히면 답글 상태도 닫히고, 쓴 글이 있으면 답글 상태를 둔다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await addComment(user, '내 댓글');

    await user.click(screen.getByRole('button', { name: /댓글에 답글 달기/ }));
    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull();

    await user.click(screen.getByRole('button', { name: /댓글에 답글 달기/ }));
    await user.type(screen.getByRole('textbox'), '쓰던 답글');
    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
  });

  it('좋아요는 응답 전에 수와 함께 바뀌고, 실패하면 되돌린다', async () => {
    const user = userEvent.setup();
    // 응답을 붙잡아 둘 약속을 요청 전에 만들어, 요청이 늦게 들어와도 풀림
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.put('/api/bundles/:bundleId/like', async () => {
        await held;
        return fail(500, 'COMMON_999');
      }),
    );
    renderDetail('2');
    const like = screen.getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveAccessibleName('좋아요 5');

    release();
    await waitFor(() => expect(like).toHaveAccessibleName('좋아요 4'));
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(toast).toHaveBeenCalledWith('좋아요를 반영하지 못했어요. 다시 시도해 주세요');
  });

  it('소속 번치가 없으면 입력 안내에 번치 이름이 없고, 번치 명의 행동은 토스트로 막는다', async () => {
    const user = userEvent.setup();
    renderDetail('3', { viewer: null });

    expect(screen.getByRole('textbox', { name: '댓글 달기' })).toBeTruthy();
    const like = screen.getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.');
  });

  it('말풍선을 누르면 댓글 영역으로 스크롤하고 입력란에 초점을 둔다', async () => {
    const user = userEvent.setup();
    renderDetail();
    const section = screen.getByRole('region', { name: '댓글' });
    placeComments(section);

    const focus = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');
    await user.click(screen.getByRole('button', { name: /^댓글/ }));
    expect(section.closest('main')!.scrollTop).toBe(500);
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
    // preventScroll을 주면 iOS가 입력란을 키보드 위로 올리지 않아 가려짐
    expect(focus).toHaveBeenCalledWith();
    focus.mockRestore();
  });

  it('?section=comments(댓글 알림)로 들어오면 댓글 영역으로 스크롤만 하고 입력란에 초점을 주지 않는다', async () => {
    renderDetail('1', { showComments: true });
    const section = screen.getByRole('region', { name: '댓글' });
    placeComments(section);

    await waitFor(() => expect(section.closest('main')!.scrollTop).toBe(500));
    expect(document.activeElement).not.toBe(screen.getByRole('textbox'));
  });

  it('?comment=(댓글 알림의 댓글 ID)로 들어오면 답글까지 찾아가 초점을 준다', async () => {
    renderDetail('901', { showComments: true, targetCommentId: '5002' });
    const region = screen.getByRole('region', { name: '댓글' });
    await within(region).findByText('좋아요 🙌');
    const reply = within(region).getByRole('listitem', { name: '큐시즘님의 답글' });

    await waitFor(() => expect(document.activeElement).toBe(reply));
    // 코드로 준 초점은 떠날 때까지 테두리를 감춤
    expect(reply.hasAttribute('data-quiet-focus')).toBe(true);
    // 키보드를 쓰기 시작하면 바로 테두리를 보임
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(reply.hasAttribute('data-quiet-focus')).toBe(false);
    expect(document.activeElement).toBe(reply);
    // 초점을 받으면 작성자 이름 다음에 본문도 읽힘
    const body = document.getElementById(reply.getAttribute('aria-describedby')!);
    expect(body?.textContent).toBeTruthy();
    expect(document.activeElement).not.toBe(screen.getByRole('textbox'));
  });

  it('알림의 댓글이 다음 쪽에 있으면 그 쪽을 받아 찾아간다', async () => {
    seedManyComments(25);
    renderDetail('901', { showComments: true, targetCommentId: '6000' });

    expect(await screen.findByText('오래된 댓글 1', {}, { timeout: 3000 })).toBeTruthy();
    await waitFor(() => expect(document.activeElement?.id).toBe('comment-6000'));
  });

  describe('화면 전환 중 진입', () => {
    // 예약된 프레임을 직접 실행해 시간에 기대지 않고 전환 대기 분기를 검사
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    let now = 0;
    const leaving = document.createElement('div');
    leaving.setAttribute('data-page-leaving', '');
    const runFrames = () =>
      act(() => {
        const due = [...frames.values()];
        frames.clear();
        due.forEach((callback) => callback(now));
      });
    const textbox = () => screen.getByRole('textbox');

    beforeEach(() => {
      frames.clear();
      now = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        nextFrame += 1;
        frames.set(nextFrame, callback);
        return nextFrame;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => frames.delete(id));
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      document.body.append(leaving);
    });
    afterEach(() => {
      // 화면을 먼저 내려 effect 정리가 가짜 rAF 그대로 돌게 한 뒤 되돌림. 실패해도 다음 테스트가 전환 중으로 보고 기다리지 않게 표식도 지움
      cleanup();
      leaving.remove();
      vi.restoreAllMocks();
    });

    it('나가는 화면이 남아 있는 동안은 기다리고, 사라진 다음 프레임에 입력란에 초점을 둔다', () => {
      renderDetail('1', { focusComments: true });

      runFrames();
      expect(document.activeElement).not.toBe(textbox());

      leaving.remove();
      runFrames();
      expect(document.activeElement).toBe(textbox());
    });

    it('말풍선 진입은 카드가 열리기 전에 이미 댓글 위치로 내려 두고, 전환이 끝나면 입력란에 초점을 둔다', () => {
      // 처음 그려지는 순간의 배치(happy-dom은 배치가 없음): 댓글 영역은 main 내용의 500px 지점, 스크롤만큼 올라감
      // defineProperty 설명 객체의 메서드는 this가 any라 요소로 바꿔 씀
      const proto = HTMLElement.prototype;
      const height = Object.getOwnPropertyDescriptor(proto, 'scrollHeight');
      const patched = proto as unknown as Record<string, unknown>;
      Object.defineProperty(proto, 'getBoundingClientRect', {
        configurable: true,
        value() {
          const element = this as HTMLElement;
          if (element.tagName !== 'SECTION') return { top: 0 } as DOMRect;
          return { top: 500 - (element.closest('main')?.scrollTop ?? 0) } as DOMRect;
        },
      });
      Object.defineProperty(proto, 'scrollHeight', {
        configurable: true,
        get() {
          return (this as HTMLElement).tagName === 'MAIN' ? 2000 : 0;
        },
      });
      try {
        renderDetail('1', { focusComments: true });
        const main = screen.getByRole('region', { name: '댓글' }).closest('main')!;
        // 전환이 끝나기 전(나가는 화면 표식이 남아 있음)에 이미 댓글 위치
        expect(main.scrollTop).toBe(500);
        leaving.remove();
        runFrames();
        expect(main.scrollTop).toBe(500);
        expect(document.activeElement).toBe(textbox());
      } finally {
        delete patched.getBoundingClientRect;
        if (height) Object.defineProperty(proto, 'scrollHeight', height);
        else delete patched.scrollHeight;
      }
    });

    it('알림 진입은 전환이 끝나면 댓글로 부드럽게 내리고 초점은 옮기지 않는다', () => {
      renderDetail('1', { showComments: true });
      const section = screen.getByRole('region', { name: '댓글' });
      const main = section.closest('main')!;
      placeComments(section);
      const scrollTo = vi.fn();
      main.scrollTo = scrollTo as typeof main.scrollTo;

      leaving.remove();
      runFrames();
      expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' });
      act(() => {
        main.dispatchEvent(new Event('scrollend'));
      });
      expect(document.activeElement).not.toBe(textbox());
    });

    it('푸시로 열면(via=push) 전환을 기다리지 않고 애니메이션 없이 그 댓글 위치에 둔다', async () => {
      renderDetail('901', { showComments: true, targetCommentId: '5002', instantComment: true });
      const region = screen.getByRole('region', { name: '댓글' });
      await within(region).findByText('좋아요 🙌');
      const main = region.closest('main')!;
      const scrollTo = vi.fn();
      main.scrollTo = scrollTo as typeof main.scrollTo;

      // 나가는 화면 표식이 남아 있어도 기다리지 않음
      runFrames();
      runFrames();
      const reply = within(region).getByRole('listitem', { name: '큐시즘님의 답글' });
      expect(document.activeElement).toBe(reply);
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('찾은 뒤 위쪽 답글이 늦게 그려져 대상이 밀리면 상한까지 바로 되돌리고, 상한이 지나면 멈춘다', async () => {
      renderDetail('901', { showComments: true, targetCommentId: '5002', instantComment: true });
      const region = screen.getByRole('region', { name: '댓글' });
      await within(region).findByText('좋아요 🙌');
      const main = region.closest('main')!;
      // happy-dom은 배치가 없어 스크롤 가능한 높이만 줌
      Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 2000 });
      runFrames();
      runFrames();
      const reply = within(region).getByRole('listitem', { name: '큐시즘님의 답글' });
      expect(document.activeElement).toBe(reply);

      // 늦게 그려진 답글로 대상이 300px 아래로 밀림
      const box = vi.spyOn(reply, 'getBoundingClientRect').mockReturnValue({ top: 300 } as DOMRect);
      runFrames();
      expect(main.scrollTop).toBe(300);
      // 되돌린 뒤 제자리면 더 쓰지 않음
      box.mockReturnValue({ top: 0 } as DOMRect);
      runFrames();
      expect(main.scrollTop).toBe(300);

      now = 5000;
      runFrames();
      expect(frames.size).toBe(0);
    });

    // 위 테스트와 같은 진입: 대상 답글에 초점이 갈 때까지
    const enterReply = async () => {
      renderDetail('901', { showComments: true, targetCommentId: '5002', instantComment: true });
      const region = screen.getByRole('region', { name: '댓글' });
      await within(region).findByText('좋아요 🙌');
      const main = region.closest('main')!;
      Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 2000 });
      runFrames();
      runFrames();
      const reply = within(region).getByRole('listitem', { name: '큐시즘님의 답글' });
      expect(document.activeElement).toBe(reply);
      return { main, reply };
    };

    it('화면보다 긴 댓글은 윗부분을 맞춘 채 두고 가운데로 내리지 않는다', async () => {
      const { main, reply } = await enterReply();
      Object.defineProperty(main, 'clientHeight', { configurable: true, value: 400 });
      Object.defineProperty(reply, 'offsetHeight', { configurable: true, value: 1000 });
      runFrames();
      expect(main.scrollTop).toBe(0);
    });

    it('위치를 지키는 동안 화면에 손을 대면 멈추고 되돌리지 않는다', async () => {
      const { main, reply } = await enterReply();
      fireEvent.touchStart(document);
      vi.spyOn(reply, 'getBoundingClientRect').mockReturnValue({ top: 300 } as DOMRect);
      runFrames();
      expect(main.scrollTop).toBe(0);
      expect(frames.size).toBe(0);
    });

    it('터치 이벤트 없이 스크롤되면(스크린 리더·스위치 조작) 사용자 위치로 보고 되돌리지 않는다', async () => {
      const { main, reply } = await enterReply();
      runFrames();
      main.scrollTop = 120;
      vi.spyOn(reply, 'getBoundingClientRect').mockReturnValue({ top: 300 } as DOMRect);
      runFrames();
      expect(main.scrollTop).toBe(120);
      expect(frames.size).toBe(0);
    });

    it('이미 다른 곳에 초점이 있어 옮기지 않았으면 위치도 지키지 않는다', async () => {
      renderDetail('901', { showComments: true, targetCommentId: '5002', instantComment: true });
      const region = screen.getByRole('region', { name: '댓글' });
      await within(region).findByText('좋아요 🙌');
      const main = region.closest('main')!;
      Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 2000 });
      const reply = within(region).getByRole('listitem', { name: '큐시즘님의 답글' });
      vi.spyOn(reply, 'getBoundingClientRect').mockReturnValue({ top: 300 } as DOMRect);
      act(() => screen.getByRole('textbox').focus());
      runFrames();
      runFrames();
      runFrames();
      expect(document.activeElement).not.toBe(reply);
      expect(frames.size).toBe(0);
    });

    it('초점이 대상 밖으로 가면(스크린 리더 탐색 등) 위치 지키기를 멈춘다', async () => {
      const { main, reply } = await enterReply();
      act(() => screen.getByRole('textbox').focus());
      vi.spyOn(reply, 'getBoundingClientRect').mockReturnValue({ top: 300 } as DOMRect);
      runFrames();
      expect(main.scrollTop).toBe(0);
      expect(frames.size).toBe(0);
    });

    it('알림의 댓글이 없으면(지워짐 등) 잠시 뒤 댓글 영역을 보이고, 상한이 지나면 찾기를 멈춘다', async () => {
      renderDetail('901', { showComments: true, targetCommentId: '99999' });
      const region = screen.getByRole('region', { name: '댓글' });
      await within(region).findByText('좋아요 🙌');
      const main = region.closest('main')!;
      placeComments(region);
      const scrollTo = vi.fn();
      main.scrollTo = scrollTo as typeof main.scrollTo;
      leaving.remove();

      runFrames();
      runFrames();
      expect(scrollTo).not.toHaveBeenCalled();
      now = 600;
      runFrames();
      expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' });
      now = 5000;
      runFrames();
      expect(frames.size).toBe(0);
      expect(document.activeElement).not.toBe(textbox());
    });

    it('표식이 남아 있어도 최대 대기 시간(1초)이 지나면 입력란에 초점을 둔다', () => {
      renderDetail('1', { focusComments: true });

      now = 999;
      runFrames();
      expect(document.activeElement).not.toBe(textbox());

      now = 1000;
      runFrames();
      expect(document.activeElement).toBe(textbox());
    });

    it('기다리는 동안 사용자가 키를 누르면 예약한 스크롤·초점을 취소한다', async () => {
      const user = userEvent.setup();
      renderDetail('1', { focusComments: true });
      const section = screen.getByRole('region', { name: '댓글' });
      placeComments(section);

      runFrames();
      // 뒤로 가기 버튼으로 초점을 옮김
      await user.tab();
      const moved = document.activeElement;
      leaving.remove();
      runFrames();

      expect(document.activeElement).toBe(moved);
      expect(section.closest('main')!.scrollTop).toBe(0);
    });

    it('기다리는 동안 빈 곳을 누르면(연달아 누른 두 번째 누름) 그대로 진행한다', () => {
      renderDetail('1', { focusComments: true });
      runFrames();

      // 빈 곳(제목 글자) 누름은 진행
      fireEvent.pointerDown(screen.getByRole('heading', { level: 1 }));
      leaving.remove();
      runFrames();
      expect(document.activeElement).toBe(textbox());
    });

    it('기다리는 동안 휠이나 손가락으로 끌어 스크롤하면 예약한 스크롤·초점을 취소한다', () => {
      for (const scroll of [
        (target: Element) => fireEvent.wheel(target),
        (target: Element) => fireEvent.touchMove(target),
      ]) {
        const { unmount } = renderDetail('1', { showComments: true });
        const section = screen.getByRole('region', { name: '댓글' });
        placeComments(section);
        const main = section.closest('main')!;
        const scrollTo = vi.fn();
        main.scrollTo = scrollTo as typeof main.scrollTo;
        runFrames();

        scroll(main);
        leaving.remove();
        runFrames();
        expect(scrollTo).not.toHaveBeenCalled();
        unmount();
        document.body.append(leaving);
      }
    });

    it('기다리는 동안 누를 수 있는 요소를 누르면 예약한 초점을 취소한다', () => {
      renderDetail('1', { focusComments: true });
      runFrames();

      fireEvent.pointerDown(screen.getByRole('button', { name: '뒤로 가기' }));
      leaving.remove();
      runFrames();
      expect(document.activeElement).not.toBe(textbox());
    });
  });

  it('?focus=comments와 ?section=comments가 함께 오면 입력란 초점을 둔다', async () => {
    renderDetail('1', { focusComments: true, showComments: true });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox')));
  });

  it('댓글이 없으면 빈 안내를 보인다', async () => {
    renderDetail('2');
    expect(await screen.findByText('아직 작성된 댓글이 없어요')).toBeTruthy();
  });

  it('?focus=comments로 들어오면 댓글 영역으로 스크롤하고 입력란에 초점을 둔다', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderDetail('1', { focusComments: true });
    const section = screen.getByRole('region', { name: '댓글' });
    placeComments(section);

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox')));
    expect(section.closest('main')!.scrollTop).toBe(500);
    // 전환 중 바깥 틀을 가로로 밀지 않게 scrollIntoView를 쓰지 않음
    expect(scrollIntoView).not.toHaveBeenCalled();
    // jsdom에 원래 없는 메서드라 다음 테스트로 남지 않게 지움
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('스크롤한 채 화면을 떠나면 나가는 화면이 튀지 않게 스크롤을 transform으로 옮긴다', () => {
    const { container, unmount } = renderDetail('1', { viewer: null });
    const main = container.querySelector('main')!;
    const firstChild = main.firstElementChild as HTMLElement;
    main.scrollTop = 400;

    unmount();
    expect(main.scrollTop).toBe(0);
    expect(firstChild.style.transform).toBe('translateY(-400px)');
  });

  describe('다른 화면에 갔다가 뒤로 돌아옴(이 기록 항목에 떠날 때의 스크롤이 저장돼 있음)', () => {
    afterEach(() => window.history.replaceState(null, ''));

    it('떠날 때의 스크롤 위치로 복원한다', () => {
      window.history.replaceState({ pageScroll: 300 }, '');
      const { container } = renderDetail('1', { viewer: null });

      expect(container.querySelector('main')!.scrollTop).toBe(300);
    });

    it('?focus=comments로 들어왔던 화면이면 진입 스크롤·입력란 초점을 다시 하지 않는다', async () => {
      window.history.replaceState({ pageScroll: 120 }, '');
      renderDetail('1', { focusComments: true });
      const section = screen.getByRole('region', { name: '댓글' });
      placeComments(section);

      // 진입 처리는 다음 프레임부터 돌므로 몇 프레임 기다림
      await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
      expect(section.closest('main')!.scrollTop).toBe(120);
      expect(document.activeElement).not.toBe(screen.getByRole('textbox'));
    });
  });

  it('키보드가 올라와 보이는 높이가 줄면 입력란에 표식을 달고, 내려가면 뗀다', () => {
    const viewport = Object.assign(new EventTarget(), {
      height: window.innerHeight - 300,
      scale: 1,
    });
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    renderDetail();
    const composer = screen.getByRole('textbox').closest('[data-keyboard-open]');
    expect(composer).not.toBeNull();

    viewport.height = window.innerHeight;
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(document.querySelector('[data-keyboard-open]')).toBeNull();
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
  });

  it.each([
    [404, 'RESOURCE_001'],
    [403, 'AUTH_002'],
    [400, 'COMMON_001'],
  ])(
    '서버가 %s(없음·볼 수 없음·잘못된 주소)이면 볼 수 없다는 안내와 뒤로 가기만 있다',
    async (status, code) => {
      server.use(
        http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () => fail(status, code)),
      );
      renderDetail('99');

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: '삭제되었거나 볼 수 없는 내용이에요',
        }),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeTruthy();
      expect(screen.queryByRole('textbox')).toBeNull();
    },
  );

  it('댓글은 맨 위에, 답글은 그 댓글 아래에 등록하고 수와 「답글 N」을 올린다', async () => {
    const user = userEvent.setup();
    renderDetail();
    const input = () => screen.getByRole('textbox', { name: /달기/ });
    const send = () => screen.getByRole('button', { name: '보내기' });

    await user.type(input(), '   ');
    expect(send()).toBeDisabled();
    await user.clear(input());
    await user.type(input(), '  첫 댓글  ');
    // 댓글 수는 서버 값(이 번들은 가짜 서버에 댓글이 없음)
    await screen.findByText('아직 작성된 댓글이 없어요');
    expect(screen.getByRole('button', { name: /댓글 0/ })).toBeTruthy();
    await user.click(send());

    const items = () =>
      within(screen.getByRole('region', { name: '댓글' })).getAllByRole('listitem');
    await screen.findByText('첫 댓글');
    expect(within(items()[0]!).getByText('첫 댓글')).toBeTruthy();
    expect(input()).toHaveValue('');
    expect(screen.getByRole('button', { name: /댓글 1/ })).toBeTruthy();
    await waitFor(() => expect(items()[0]).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('댓글을 등록했어요');

    await user.click(screen.getByRole('button', { name: /댓글에 답글 달기/ }));
    await user.type(input(), '답글이에요');
    await user.click(send());

    await screen.findByText('답글이에요');
    expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull();
    expect(screen.getByRole('button', { name: '큐시즘님 댓글의 답글 1개' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /댓글 2/ })).toBeTruthy();
    // 원댓글 아래
    expect(within(items()[1]!).getByText('답글이에요')).toBeTruthy();
  });

  it('내 댓글은 더보기 → 「삭제」 → 확인 뒤 「삭제된 댓글입니다」로 바뀌고 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await addComment(user, '지울 댓글');
    await user.click(screen.getByRole('button', { name: /^내 댓글 더보기/ }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog', { name: '댓글을 삭제할까요?' });
    expect(within(dialog).getByText('데이터가 삭제되며 복구 불가능해요.')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('댓글을 삭제했어요'));
    expect(screen.queryByRole('button', { name: /^내 댓글 더보기/ })).toBeNull();
    expect(screen.getAllByText('삭제된 댓글입니다')).toHaveLength(1);
  });

  it('답글을 쓰던 댓글을 지우면 답글 상태가 풀린다', async () => {
    const user = userEvent.setup();
    renderDetail('2');
    await addComment(user, '내 댓글');

    await user.click(screen.getByRole('button', { name: /댓글에 답글 달기/ }));
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /^내 댓글 더보기/ }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull());
    expect(screen.getByRole('listitem', { name: '삭제된 댓글' })).toHaveFocus();
    expect(toast).toHaveBeenCalledWith('댓글을 삭제했어요');
  });

  it('삭제 확인 창의 「취소」는 댓글을 그대로 둔다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await addComment(user, '남길 댓글');

    await user.click(screen.getByRole('button', { name: /^내 댓글 더보기/ }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('button', { name: /^내 댓글 더보기/ })).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });

  it('보내기를 연타해도 한 번만 등록한다', async () => {
    const user = userEvent.setup();
    renderDetail('2');

    await user.type(screen.getByRole('textbox', { name: /달기/ }), '한 번');
    await user.dblClick(screen.getByRole('button', { name: '보내기' }));

    await screen.findByText('한 번');
    expect(screen.getByRole('button', { name: /댓글 1/ })).toBeTruthy();
    expect(screen.getAllByText('한 번')).toHaveLength(1);
  });

  it('서버 댓글을 원댓글 최신순, 답글은 그 아래로 보이고 메뉴는 서버 권한을 따른다', async () => {
    renderDetail('901');
    const region = screen.getByRole('region', { name: '댓글' });
    await within(region).findByText('좋아요 🙌');

    const items = within(region).getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual([
      '큐시즘님의 댓글',
      '삭제된 댓글',
      '지예님의 댓글',
      '큐시즘님의 답글',
    ]);
    expect(within(items[0]!).getByText('사진 너무 예뻐요')).toBeTruthy();
    // 삭제 자리: 메뉴·답글 버튼 없음
    expect(within(items[1]!).queryAllByRole('button')).toHaveLength(0);
    // 남의 원댓글: 신고 메뉴와 「답글 1」, 그 아래 내 답글은 삭제 메뉴
    expect(within(items[2]!).getByRole('button', { name: /지예 댓글 더보기/ })).toBeTruthy();
    expect(within(items[2]!).getByRole('button', { name: '지예님 댓글의 답글 1개' })).toBeTruthy();
    expect(within(items[3]!).getByRole('button', { name: /^내 댓글 더보기/ })).toBeTruthy();
    expect(within(items[3]!).queryByRole('button', { name: /답글/ })).toBeNull();
    expect(screen.getByRole('button', { name: /댓글 4/ })).toBeTruthy();
  });

  /** 지예 원댓글 더보기 → 「신고」 → 사유 「스팸」으로 신고하기 */
  const reportJiye = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('button', { name: /지예 댓글 더보기/ }));
    await user.click(await screen.findByRole('button', { name: '신고' }));
    const sheet = await screen.findByRole('dialog', { name: '이 댓글을 신고할까요?' });
    await user.click(within(sheet).getByRole('radio', { name: '스팸' }));
    await user.click(within(sheet).getByRole('button', { name: '신고하기' }));
  };

  it('남의 댓글을 신고하면 서버가 접수한 뒤 댓글과 답글을 그대로 두고 알린다', async () => {
    const user = userEvent.setup();
    renderDetail('901');
    await reportJiye(user);

    await waitFor(() => expect(toast).toHaveBeenCalledWith('신고가 접수됐어요.'));
    expect(screen.getByRole('listitem', { name: '지예님의 댓글' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: '큐시즘님의 답글' })).toBeTruthy();
    // 5001: 지예 원댓글(답글 5002가 달린)
    expect(mockDb.get().reports.at(-1)).toMatchObject({
      bundleId: 901,
      commentId: 5001,
      reason: 'SPAM',
    });
  });

  it('댓글 신고가 실패하면 댓글을 남기고 알린다', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/bundles/:bundleId/comments/:commentId/reports', () =>
        fail(500, 'COMMON_000'),
      ),
    );
    renderDetail('901');
    await reportJiye(user);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(screen.getByRole('listitem', { name: '지예님의 댓글' })).toBeTruthy();
    expect(toast).not.toHaveBeenCalledWith('신고가 접수됐어요.');
  });

  it('같은 댓글을 세 번째 신고하면(BUNCH_011) 댓글을 남기고 검토 중이라고 알린다', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/bundles/:bundleId/comments/:commentId/reports', () => fail(409, 'BUNCH_011')),
    );
    renderDetail('901');
    await reportJiye(user);

    await waitFor(() => expect(toast).toHaveBeenCalledWith('이미 신고가 접수되어 검토 중이에요.'));
    expect(screen.getByRole('listitem', { name: '지예님의 댓글' })).toBeTruthy();
    expect(toast).not.toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요');
  });

  it('답글 대상이 그사이 지워졌으면 답글 상태를 풀고 쓴 내용은 남긴 채 알린다', async () => {
    const user = userEvent.setup();
    server.use(http.post('/api/bundles/:bundleId/comments', () => fail(409, 'BUNDLE_002')));
    renderDetail('901');
    await user.click(await screen.findByRole('button', { name: '지예님 댓글의 답글 1개' }));
    await user.type(screen.getByRole('textbox'), '늦은 답글');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('삭제된 댓글입니다'));
    expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull();
    expect(screen.getByRole('textbox')).toHaveValue('늦은 답글');
  });

  it('보내면 입력란을 비우고 응답 전까지 「등록 중…」 내 댓글을 먼저 보인 뒤 서버 댓글로 바꾼다', async () => {
    // 테스트가 풀어 줄 때까지 응답을 막은 뒤 원래 handler로 넘김
    const release = holdCommentPost();
    const user = userEvent.setup();
    renderDetail('2');
    await user.type(screen.getByRole('textbox', { name: /달기/ }), '먼저 보임');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    expect(screen.getByRole('textbox')).toHaveValue('');
    const pending = screen.getByText('등록 중…').closest('li');
    expect(within(pending!).getByText('먼저 보임')).toBeTruthy();
    expect(within(pending!).queryByRole('button', { name: /더보기|답글/ })).toBeNull();
    expect(screen.getByText('댓글을 등록하는 중이에요')).toBeTruthy();
    release();
    await waitFor(() => expect(screen.queryByText('등록 중…')).toBeNull());
    expect(screen.getAllByText('먼저 보임')).toHaveLength(1);
  });

  it('앞의 댓글을 기다리는 동안 또 보내면 쓴 글을 두고 알린다', async () => {
    const release = holdCommentPost();
    const user = userEvent.setup();
    renderDetail('2');
    await user.type(screen.getByRole('textbox', { name: /달기/ }), '첫 글');
    await user.click(screen.getByRole('button', { name: '보내기' }));
    await user.type(screen.getByRole('textbox'), '둘째 글');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    expect(toast).toHaveBeenCalledWith('앞의 댓글을 등록하는 중이에요. 잠시 뒤에 보내 주세요.');
    expect(screen.getByRole('textbox')).toHaveValue('둘째 글');
    release();
    await waitFor(() => expect(screen.queryByText('등록 중…')).toBeNull());
  });

  it('응답을 기다리는 동안 다른 댓글의 답글을 골랐으면 성공해도 초점을 옮기지 않고 답글 상태를 둔다', async () => {
    const release = holdCommentPost();
    const user = userEvent.setup();
    renderDetail('901');
    const input = await screen.findByRole('textbox', { name: /달기/ });
    await user.type(input, '먼저 보낸 글');
    await user.click(screen.getByRole('button', { name: '보내기' }));
    await user.click(await screen.findByRole('button', { name: '지예님 댓글의 답글 1개' }));
    release();

    await waitFor(() => expect(screen.queryByText('등록 중…')).toBeNull());
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('답글에 금칙어가 있으면 등록하지 않고 쓴 내용과 답글 작성 상태를 그대로 둔 채 알린다', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/bundles/:bundleId/comments', () =>
        fail(400, 'COMMON_003', { fields: ['content'] }),
      ),
    );
    renderDetail('901');
    await user.click(await screen.findByRole('button', { name: '지예님 댓글의 답글 1개' }));
    await user.type(screen.getByRole('textbox'), '나쁜 답글');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('사용할 수 없는 단어가 포함되어 있어요.'),
    );
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
    expect(screen.getByRole('textbox')).toHaveValue('나쁜 답글');
    expect(screen.queryByText('등록 중…')).toBeNull();
    expect(toast).not.toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요');
  });

  it('쓰는 사이 번들을 볼 수 없게 됐으면 이전 화면으로 가서 알린다', async () => {
    const user = userEvent.setup();
    server.use(http.post('/api/bundles/:bundleId/comments', () => fail(404, 'RESOURCE_001')));
    renderDetail('901');
    await user.type(screen.getByRole('textbox'), '안녕');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() =>
      expect(toastAfterNavigation).toHaveBeenCalledWith('더 이상 볼 수 없는 번들이에요.'),
    );
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
  });

  it('등록이 실패하면 쓴 내용을 남기고 알린다', async () => {
    const user = userEvent.setup();
    server.use(http.post('/api/bundles/:bundleId/comments', () => fail(500, 'COMMON_999')));
    renderDetail('901');
    await user.type(screen.getByRole('textbox'), '다시 보낼 댓글');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(screen.getByRole('textbox')).toHaveValue('다시 보낼 댓글');
  });

  it('댓글을 받지 못하면 그 자리에 안내와 다시 시도를 두고, 다시 시도하면 목록을 보인다', async () => {
    const user = userEvent.setup();
    let failing = true;
    server.use(
      http.get('/api/bundles/:bundleId/comments', () =>
        failing ? fail(500, 'COMMON_999') : undefined,
      ),
    );
    renderDetail('901');
    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했어요');

    failing = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    // 버튼이 사라져도 초점은 댓글 영역에 남음
    expect(screen.getByRole('region', { name: '댓글' })).toHaveFocus();
    expect(await screen.findByText('사진 너무 예뻐요')).toBeTruthy();
  });

  it('이미 지워진 댓글을 지우면 따로 알리지 않고 목록을 맞춘다', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete('/api/bundles/:bundleId/comments/:commentId', () => fail(404, 'RESOURCE_001')),
    );
    renderDetail('901');
    const [mine] = await screen.findAllByRole('button', { name: /^내 댓글 더보기/ });
    await user.click(mine!);
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await screen.findByText('사진 너무 예뻐요')).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });

  it('목록 끝이 보이면 다음 쪽을 받는다', async () => {
    vi.stubGlobal('IntersectionObserver', VisibleObserver);
    seedManyComments(20);
    renderDetail('901');
    expect(await screen.findByText('오래된 댓글 1')).toBeTruthy();
  });

  it('다음 쪽을 받지 못하면 보이던 댓글은 두고 안내와 다시 시도를 보인다', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('IntersectionObserver', VisibleObserver);
    seedManyComments(20);
    let failing = true;
    server.use(
      http.get('/api/bundles/:bundleId/comments', ({ request }) =>
        failing && new URL(request.url).searchParams.has('cursor')
          ? fail(500, 'COMMON_999')
          : undefined,
      ),
    );
    renderDetail('901');
    expect(await screen.findByRole('alert')).toHaveTextContent('댓글을 더 불러오지 못했어요');
    expect(screen.getByText('사진 너무 예뻐요')).toBeTruthy();

    failing = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    // 버튼이 사라져도 초점은 댓글 영역에 남음
    expect(screen.getByRole('region', { name: '댓글' })).toHaveFocus();
    expect(await screen.findByText('오래된 댓글 1')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('답글을 쓰는 사이 번들이 사라졌으면 다시 받은 목록을 보고 이전 화면으로 간다', async () => {
    const user = userEvent.setup();
    let gone = false;
    server.use(
      http.post('/api/bundles/:bundleId/comments', () => {
        gone = true;
        return fail(404, 'RESOURCE_001');
      }),
      http.get('/api/bundles/:bundleId/comments', () =>
        gone ? fail(404, 'RESOURCE_001') : undefined,
      ),
    );
    renderDetail('901');
    await user.click(await screen.findByRole('button', { name: '지예님 댓글의 답글 1개' }));
    await user.type(screen.getByRole('textbox'), '답글');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() =>
      expect(toastAfterNavigation).toHaveBeenCalledWith('더 이상 볼 수 없는 번들이에요.'),
    );
    // 다시 받은 목록이 실패해도 한 번만 떠남
    expect(
      toastAfterNavigation.mock.calls.filter(
        ([message]) => message === '더 이상 볼 수 없는 번들이에요.',
      ),
    ).toHaveLength(1);
  });

  it('소속 번치가 없으면 댓글을 등록하지 않고 안내한다', async () => {
    const user = userEvent.setup();
    // 가짜 서버의 지금 번치와 달리 소속 번치가 없는 화면이라 목록은 빈 응답으로
    server.use(
      http.get('/api/bundles/:bundleId/comments', () =>
        ok({ items: [], nextCursor: null, hasNext: false, totalCount: 0 }),
      ),
    );
    renderDetail('3', { viewer: null });

    await user.type(screen.getByRole('textbox', { name: '댓글 달기' }), '안녕');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.');
    expect(await screen.findByText('아직 작성된 댓글이 없어요')).toBeTruthy();
  });

  it('다른 번치 번들은 헤더 더보기 → 「신고」 → 신고하면 화면에 남아 알린다', async () => {
    const user = userEvent.setup();
    renderDetail('2');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '신고' }));
    const sheet = await screen.findByRole('dialog', { name: '이 게시글을 신고할까요?' });
    await user.click(within(sheet).getByRole('radio', { name: '스팸' }));
    await user.click(within(sheet).getByRole('button', { name: '신고하기' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('신고가 접수됐어요.'));
    expect(back).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '번들 더보기' })).toBeTruthy();
  });

  it('번들 신고가 실패하면 화면에 남아 실패를 알린다', async () => {
    server.use(http.post('/api/bundles/:bundleId/reports', () => fail(500, 'COMMON_000')));
    const user = userEvent.setup();
    renderDetail('2');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '신고' }));
    const sheet = await screen.findByRole('dialog', { name: '이 게시글을 신고할까요?' });
    await user.click(within(sheet).getByRole('radio', { name: '스팸' }));
    await user.click(within(sheet).getByRole('button', { name: '신고하기' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(toastAfterNavigation).not.toHaveBeenCalled();
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(0);
  });

  it('같은 번들을 세 번째 신고하면(BUNCH_011) 화면에 남아 검토 중이라고 알린다', async () => {
    server.use(http.post('/api/bundles/:bundleId/reports', () => fail(409, 'BUNCH_011')));
    const user = userEvent.setup();
    renderDetail('2');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '신고' }));
    const sheet = await screen.findByRole('dialog', { name: '이 게시글을 신고할까요?' });
    await user.click(within(sheet).getByRole('radio', { name: '스팸' }));
    await user.click(within(sheet).getByRole('button', { name: '신고하기' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('이미 신고가 접수되어 검토 중이에요.'));
    expect(toastAfterNavigation).not.toHaveBeenCalled();
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(0);
  });

  it('소속 번치가 없으면 신고 시트를 열지 않고 안내한다', async () => {
    const user = userEvent.setup();
    renderDetail('2', { viewer: null });

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '신고' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.'));
    expect(screen.queryByRole('dialog', { name: '이 게시글을 신고할까요?' })).toBeNull();
  });

  it('메인 관리자는 헤더 더보기에서 공개 범위 설정으로 간다', async () => {
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    expect(await screen.findByRole('button', { name: '삭제하기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '수정하기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '신고' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '공개 범위 설정' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/bunches/1/bundles/1/visibility'));
  });

  it('메인 관리자는 헤더 더보기의 「수정하기」로 번들 수정 화면에 간다', async () => {
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '수정하기' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/bunches/1/bundles/1/edit'));
  });

  it('메인 관리자가 번들을 삭제하면 서버에서 지우고 이전 화면으로 가서 알린다', async () => {
    const removed: string[] = [];
    const detailGets = vi.fn();
    server.use(
      http.delete('/api/bunches/:bunchId/bundles/:id', ({ params }) => {
        removed.push(`${String(params.bunchId)}/${String(params.id)}`);
        return ok(null);
      }),
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () => {
        detailGets();
        return fail(404, 'RESOURCE_001');
      }),
    );
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '삭제하기' }));
    const dialog = await screen.findByRole('alertdialog', { name: '게시글을 삭제할까요?' });
    expect(within(dialog).getByText('데이터가 삭제되며 복구 불가능해요.')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(toastAfterNavigation).toHaveBeenCalledWith('번들을 삭제했어요'));
    expect(removed).toEqual(['1/1']);
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
    // 떠나는 동안 지운 상세를 다시 받거나 안내로 바뀌지 않음
    expect(detailGets).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', { name: '삭제되었거나 볼 수 없는 내용이에요' }),
    ).toBeNull();
  });

  it('삭제 확인 창의 「취소」는 번들을 그대로 둔다', async () => {
    const removed = vi.fn();
    server.use(
      http.delete('/api/bunches/:bunchId/bundles/:id', () => {
        removed();
        return ok(null);
      }),
    );
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '삭제하기' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '취소' }),
    );

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(removed).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('삭제하는 사이 권한을 잃었으면 알리고 화면에 남는다', async () => {
    server.use(http.delete('/api/bunches/:bunchId/bundles/:id', () => fail(403, 'AUTH_002')));
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '삭제하기' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '삭제' }),
    );

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('권한이 변경되어 해당 기능을 이용할 수 없어요.'),
    );
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(0);
  });

  it('받는 동안은 불러오는 중을 알리고, 실패하면 다시 시도로 받는다', async () => {
    const user = userEvent.setup();
    let failing = true;
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () =>
        failing ? fail(500, 'COMMON_999') : ok(DETAILS['3']),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    render(
      <BundleDetail
        bunchId="3"
        bundleId="3"
        bunch={BUNCHES['3']}
        focusComments={false}
        showComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(client) },
    );

    expect(screen.getByRole('status')).toHaveTextContent('번들을 불러오는 중이에요');
    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했어요');
    failing = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    // 버튼이 사라지면 번들 제목으로 초점
    const title = await screen.findByRole('heading', { level: 1, name: '여름밤 바닷가 캠핑' });
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('삭제 권한만 있으면 관리 메뉴에 「삭제하기」만 있다', async () => {
    const user = userEvent.setup();
    DETAILS['5'] = {
      ...DETAILS['3']!,
      id: 5,
      permissions: { canEdit: false, canDelete: true, canReport: false },
    };
    renderDetail('5');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    expect(await screen.findByRole('button', { name: '삭제하기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '공개 범위 설정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '수정하기' })).toBeNull();
  });

  it('수정·삭제 권한도 신고 권한도 없으면 헤더 더보기가 없다', () => {
    DETAILS['4'] = { ...DETAILS['3']!, id: 4, permissions: { ...REPORT, canReport: false } };
    renderDetail('4');
    expect(screen.queryByRole('button', { name: '번들 더보기' })).toBeNull();
  });

  it('번치 정보를 받지 못해도 내용은 보이고, 번치 버튼 이름은 「번치」다', () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: null });
    client.setQueryData(feedKeys.detail('3', '3', null), DETAILS['3']);
    render(
      <BundleDetail
        bunchId="3"
        bundleId="3"
        bunch={null}
        focusComments={false}
        showComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(client) },
    );
    expect(screen.getByRole('heading', { level: 1, name: '여름밤 바닷가 캠핑' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^번치/ })).toBeTruthy();
  });

  it('이미 받은 상세가 있으면 다시 받기가 실패해도 보던 내용을 그대로 둔다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () => fail(500, 'COMMON_999')),
    );
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    const key = feedKeys.detail('3', '3', '1');
    client.setQueryData(key, DETAILS['3']);
    render(
      <BundleDetail
        bunchId="3"
        bundleId="3"
        bunch={BUNCHES['3']}
        focusComments={false}
        showComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(client) },
    );

    await act(() => client.refetchQueries({ queryKey: key }));
    expect(client.getQueryState(key)?.status).toBe('error');
    expect(screen.getByRole('heading', { level: 1, name: '여름밤 바닷가 캠핑' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('다시 시도 결과가 볼 수 없음이면 초점을 안내 제목으로 옮긴다', async () => {
    const user = userEvent.setup();
    let status = 500;
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () =>
        fail(status, status === 404 ? 'RESOURCE_001' : 'COMMON_999'),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    render(
      <BundleDetail
        bunchId="3"
        bundleId="3"
        bunch={BUNCHES['3']}
        focusComments={false}
        showComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(client) },
    );

    await screen.findByRole('alert');
    status = 404;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    const notice = await screen.findByRole('heading', {
      level: 1,
      name: '삭제되었거나 볼 수 없는 내용이에요',
    });
    await waitFor(() => expect(notice).toHaveFocus());
  });

  it('내 정보를 다시 받는 동안은 받는 중 화면으로 바뀐다', async () => {
    const user = userEvent.setup();
    let attempt = 0;
    server.use(
      http.get('/api/members/me', () => {
        attempt += 1;
        return attempt === 1 ? fail(500, 'COMMON_500') : new Promise<never>(() => {});
      }),
    );
    render(
      <BundleDetail
        bunchId="3"
        bundleId="3"
        bunch={BUNCHES['3']}
        focusComments={false}
        showComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(createTestQueryClient()) },
    );

    await user.click(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('status')).toHaveTextContent('번들을 불러오는 중이에요');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('번치 정보가 늦게 와도 ?focus=comments면 본문이 그려진 뒤 입력란에 초점을 둔다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    client.setQueryData(feedKeys.detail('3', '3', '1'), DETAILS['3']);
    const view = (bunch: BundleBunchSource | undefined) => (
      <BundleDetail
        bunchId="3"
        bundleId="3"
        bunch={bunch}
        focusComments
        showComments={false}
        links={links}
      />
    );
    const { rerender } = render(view(undefined), { wrapper: createQueryWrapper(client) });
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

    rerender(view(BUNCHES['3']));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
  });

  it('상세가 먼저 오고 번치 정보가 늦어도 다시 시도 뒤 초점을 번들 제목으로 옮긴다', async () => {
    const user = userEvent.setup();
    let failing = true;
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () =>
        failing ? fail(500, 'COMMON_999') : ok(DETAILS['3']),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    const view = (bunch: BundleBunchSource | undefined) => (
      <BundleDetail
        bunchId="3"
        bundleId="3"
        bunch={bunch}
        focusComments={false}
        showComments={false}
        links={links}
      />
    );
    const { rerender } = render(view(undefined), { wrapper: createQueryWrapper(client) });

    await screen.findByRole('alert');
    failing = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() =>
      expect(client.getQueryState(feedKeys.detail('3', '3', '1'))?.status).toBe('success'),
    );

    rerender(view(BUNCHES['3']));
    const title = await screen.findByRole('heading', { level: 1, name: '여름밤 바닷가 캠핑' });
    await waitFor(() => expect(title).toHaveFocus());
  });
});
