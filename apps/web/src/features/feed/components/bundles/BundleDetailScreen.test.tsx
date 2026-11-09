import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BundleDetailScreen } from './BundleDetailScreen';

const push = vi.fn();
const toast = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

const links = { bunchHome: '/bunch', otherBunch: (id: string) => `/bunches/${id}` };

type RenderOptions = { bunch?: { id: string; name: string } | null; focusComments?: boolean };

const renderDetail = (
  bundleId = 'bundle-1',
  { bunch = { id: 'bunch-trip', name: '여행가조' }, focusComments = false }: RenderOptions = {},
) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  render(<BundleDetailScreen bundleId={bundleId} focusComments={focusComments} links={links} />, {
    wrapper: createQueryWrapper(client),
  });
};

beforeEach(() => {
  push.mockClear();
  toast.mockClear();
});

describe('BundleDetailScreen', () => {
  it('제목·멤버 공개 뱃지·사진·댓글을 보여 주고, 입력란에 지금 번치 이름이 들어간다', () => {
    renderDetail();

    expect(
      screen.getByRole('heading', { level: 1, name: '제주 3박4일 여행 아카이빙' }),
    ).toBeTruthy();
    expect(screen.getByRole('img', { name: '멤버 공개' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '1 / 4' })).toBeTruthy();
    // fixture의 셋째 사진은 1명이라 버튼이 아님
    expect(screen.getAllByRole('button', { name: /^pick / })).toHaveLength(2);
    expect(screen.getByRole('img', { name: /^pick / })).toBeTruthy();
    const comments = within(screen.getByRole('region', { name: '댓글' }));
    expect(comments.getAllByRole('listitem')).toHaveLength(4);
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

    await user.click(region.getByRole('button', { name: '작성자' }));
    expect(region.getByText('삭제된 코멘트입니다')).toBeTruthy();
  });

  it('번치를 누르면 지금 번치면 번치 탭, 아니면 다른 번치 프로필로 간다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole('button', { name: /여행가조/ }));
    expect(push).toHaveBeenLastCalledWith('/bunch');
  });

  it('다른 번치의 번들에서 번치를 누르면 다른 번치 프로필로 간다', async () => {
    const user = userEvent.setup();
    renderDetail('bundle-2');
    await user.click(screen.getByRole('button', { name: /책방산책/ }));
    expect(push).toHaveBeenLastCalledWith('/bunches/bunch-book');
  });

  it('답글을 누르면 답글 작성 상태가 되고 닫기로 돌아온다', async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole('button', { name: '수인님 댓글의 답글 1개' }));
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
    expect(
      screen.getByRole('textbox', { name: /수인님에게 답글, 여행가조로 답글 달기/ }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '답글 그만 쓰기' }));
    expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('좋아요는 수와 함께 바뀐다', async () => {
    const user = userEvent.setup();
    renderDetail('bundle-2');
    const like = screen.getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveAccessibleName('좋아요 5');
  });

  it('소속 번치가 없으면 입력 안내에 번치 이름이 없고, 번치 명의 행동은 토스트로 막는다', async () => {
    const user = userEvent.setup();
    renderDetail('bundle-3', { bunch: null });

    expect(screen.getByRole('textbox', { name: '댓글 달기' })).toBeTruthy();
    const like = screen.getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'false');
    // 입력란을 가리지 않게 헤더 아래
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.', { position: 'top' });
  });

  it('말풍선을 누르면 댓글 영역으로 스크롤하고 입력란에 초점을 둔다', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderDetail();

    await user.click(screen.getByRole('button', { name: /^댓글/ }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('댓글이 없으면 빈 안내를 보인다', () => {
    renderDetail('bundle-2');
    expect(screen.getByText('아직 작성된 댓글이 없어요')).toBeTruthy();
  });

  it('?focus=comments로 들어오면 댓글 영역으로 스크롤하고 입력란에 초점을 둔다', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderDetail('bundle-1', { focusComments: true });

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox')));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('스크롤한 채 화면을 떠나면 나가는 화면이 튀지 않게 스크롤을 transform으로 옮긴다', () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: null });
    const { container, unmount } = render(
      <BundleDetailScreen bundleId="bundle-1" focusComments={false} links={links} />,
      { wrapper: createQueryWrapper(client) },
    );
    const main = container.querySelector('main')!;
    const firstChild = main.firstElementChild as HTMLElement;
    main.scrollTop = 400;

    unmount();
    expect(main.scrollTop).toBe(0);
    expect(firstChild.style.transform).toBe('translateY(-400px)');
  });

  it('없는 번들이면 볼 수 없다는 안내와 뒤로 가기만 있다', () => {
    renderDetail('nope');

    expect(
      screen.getByRole('heading', { level: 1, name: '삭제되었거나 볼 수 없는 내용이에요' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
