import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { createBundle } from '../../api/bundles';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BundleEditProvider } from '../../contexts/BundleEditProvider';
import { BundleEdit } from './BundleEdit';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));

// 로딩 점의 lottie 엔진은 이 test의 대상이 아니므로 비움
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

const bunchId = String(MOCK_BUNCH_ID);
const PUBLISHED_ID = '1';
const DETAIL_PATH = `/bunches/${bunchId}/bundles/${PUBLISHED_ID}`;

const setRole = (role: 'OWNER' | 'CO_OWNER' | 'MEMBER') =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.map((membership) =>
      membership.memberId === MOCK_MY_MEMBER_ID && membership.bunchId === MOCK_BUNCH_ID
        ? { ...membership, role }
        : membership,
    ),
  }));

const onSaved = vi.fn();
const onImportFromGallery = vi.fn();
const renderEdit = (bundleId = PUBLISHED_ID) =>
  render(
    <BundleEditProvider bunchId={bunchId} bundleId={bundleId}>
      <BundleEdit onSaved={onSaved} onImportFromGallery={onImportFromGallery} />
    </BundleEditProvider>,
    { wrapper: createQueryWrapper(createTestQueryClient()) },
  );

const titleField = () => screen.findByRole('textbox', { name: /번들 제목/ });
const saveButton = () => screen.getByRole('button', { name: '저장' });

beforeEach(() => {
  vi.clearAllMocks();
  setRole('OWNER');
});

describe('BundleEdit 화면 구성(기능 명세 6.2.12)', () => {
  it('헤더는 뒤로가기만 있고 참여 멤버는 보기만 하며 「픽하기」가 없고 「저장」은 꺼져 있다', async () => {
    renderEdit();

    expect(await titleField()).toHaveValue('강릉 커피 투어 ☕');
    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '더보기' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^추가/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /내보내기|삭제/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '픽하기' })).toBeNull();
    expect(saveButton()).toBeDisabled();
    // 기존 안내문 문구 유지
    expect(screen.getByText(BUNDLE_MESSAGES.commentsNotice)).toBeInTheDocument();
  });

  it('내 카드를 포함한 모든 코멘트 카드가 잠겨 누르면 입력되지 않고 「업로드된 코멘트는 수정 불가해요.」만 안내한다', async () => {
    renderEdit();
    await titleField();

    const comments = screen
      .getAllByRole('textbox')
      .filter((field): field is HTMLTextAreaElement => field instanceof HTMLTextAreaElement);
    // 참여 멤버 수만큼의 카드(내 카드 포함)
    expect(comments).toHaveLength(3);
    for (const comment of comments) {
      toast.mockClear();
      await userEvent.click(comment);
      await userEvent.keyboard('가');

      expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.commentLocked);
      expect(comment).toHaveAttribute('readonly');
      expect(comment).not.toHaveFocus();
    }
    // 저장할 변경도 생기지 않음
    expect(saveButton()).toBeDisabled();
  });

  it('잠긴 코멘트 카드는 입력창 설명으로 잠긴 사유를 이어 읽어 흐림을 못 보는 사용자도 안다', async () => {
    renderEdit();
    await titleField();

    const notices = screen.getAllByText(BUNDLE_MESSAGES.commentLocked);
    expect(notices).toHaveLength(1);
    const comments = screen
      .getAllByRole('textbox')
      .filter((field): field is HTMLTextAreaElement => field instanceof HTMLTextAreaElement);
    for (const comment of comments) {
      expect(comment).toHaveAccessibleDescription(BUNDLE_MESSAGES.commentLocked);
    }
  });

  it('썸네일을 누르면 수정 중 사진 크게 보기로 간다', async () => {
    renderEdit();
    await titleField();

    await userEvent.click(
      screen.getAllByRole('button', { name: BUNDLE_MESSAGES.photoOpenLabel(1) })[0]!,
    );

    const [path] = push.mock.calls[0] as [string];
    expect(path.startsWith(`/bunches/${bunchId}/bundles/1/edit/photos/`)).toBe(true);
    expect(path.endsWith('/viewer')).toBe(true);
  });
});

describe('BundleEdit 저장', () => {
  it('제목을 바꾸면 「저장」이 켜지고, 확인 창에서 취소하면 저장하지 않는다', async () => {
    renderEdit();
    const title = await titleField();
    await userEvent.clear(title);
    await userEvent.type(title, '고친 제목');

    expect(saveButton()).toBeEnabled();
    await userEvent.click(saveButton());
    const dialog = await screen.findByRole('alertdialog', { name: '수정한 내용을 저장할까요?' });
    expect(within(dialog).getByText('변경된 내용이 기존 번들에 반영돼요.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(mockDb.get().bundles.find((bundle) => String(bundle.id) === PUBLISHED_ID)?.title).toBe(
      '강릉 커피 투어 ☕',
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('확인 창에서 「저장」하면 서버에 반영하고 상세로 돌아가 「번들을 수정했어요」를 알린다', async () => {
    renderEdit();
    const title = await titleField();
    await userEvent.clear(title);
    await userEvent.type(title, '고친 제목');
    await userEvent.click(saveButton());
    const dialog = await screen.findByRole('alertdialog', { name: '수정한 내용을 저장할까요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '저장' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(DETAIL_PATH));
    expect(mockDb.get().bundles.find((bundle) => String(bundle.id) === PUBLISHED_ID)?.title).toBe(
      '고친 제목',
    );
    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_MESSAGES.editSaved);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('저장에 실패하면 안내하고 화면에 머물며 편집 내용은 그대로이다', async () => {
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/published', () => fail(500, 'SERVER_ERROR')),
    );
    renderEdit();
    const title = await titleField();
    await userEvent.clear(title);
    await userEvent.type(title, '고친 제목');
    await userEvent.click(saveButton());
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '저장' }),
    );

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editSaveFailed));
    expect(replace).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(title).toHaveValue('고친 제목');
  });

  it('저장하는 사이 권한을 잃었으면 안내하고 상세로 돌려보낸다', async () => {
    renderEdit();
    const title = await titleField();
    await userEvent.type(title, '!');
    setRole('CO_OWNER');
    await userEvent.click(saveButton());
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '저장' }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith(DETAIL_PATH));
    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_MESSAGES.editPermissionChanged);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});

describe('BundleEdit 뒤로가기', () => {
  it('바뀐 내용이 없으면 바로 상세로 나간다', async () => {
    renderEdit();
    await titleField();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(replace.mock.calls.length + back.mock.calls.length).toBe(1);
  });

  it('바뀐 내용이 있으면 확인하고, 「계속 수정」은 머물고 「나가기」는 나간다', async () => {
    renderEdit();
    const title = await titleField();
    await userEvent.type(title, '!');

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    const first = await screen.findByRole('alertdialog', { name: '수정을 그만둘까요?' });
    expect(within(first).getByText('수정한 내용은 저장되지 않아요.')).toBeInTheDocument();
    await userEvent.click(within(first).getByRole('button', { name: '계속 수정' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(replace.mock.calls.length + back.mock.calls.length).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    const second = await screen.findByRole('alertdialog', { name: '수정을 그만둘까요?' });
    await userEvent.click(within(second).getByRole('button', { name: '나가기' }));

    await waitFor(() => expect(replace.mock.calls.length + back.mock.calls.length).toBe(1));
    expect(mockDb.get().bundles.find((bundle) => String(bundle.id) === PUBLISHED_ID)?.title).toBe(
      '강릉 커피 투어 ☕',
    );
  });
});

describe('BundleEdit 사진·위치', () => {
  it('마지막 한 장은 지울 수 없다고 안내한다', async () => {
    renderEdit();
    await titleField();

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(1) }),
    );
    const dialog = await screen.findByRole('alertdialog', { name: '사진을 삭제할 수 없어요' });
    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));

    expect(saveButton()).toBeDisabled();
  });

  it('위치를 더하면 바뀐 내용이 되어 「저장」이 켜진다', async () => {
    renderEdit();
    await titleField();

    await userEvent.click(screen.getByRole('button', { name: /위치 추가/ }));
    const search = await screen.findByRole('searchbox');
    await userEvent.type(search, '여의도');
    await userEvent.click(await screen.findByRole('button', { name: /여의도한강공원/ }));

    await waitFor(() => expect(saveButton()).toBeEnabled());
  });
});

describe('BundleEdit 접근 조건', () => {
  it('메인 관리자가 아니면 권한 안내 뒤 상세로 돌려보낸다', async () => {
    setRole('MEMBER');
    renderEdit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith(DETAIL_PATH));
    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_MESSAGES.editPermissionChanged);
  });

  it('발행 전 초안이면 작성 화면으로 보낸다', async () => {
    const draft = await createBundle(bunchId, ['1'], createIdempotencyKey(), ['2']);
    renderEdit(draft.id);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/bunch/drafts/${draft.id}`));
  });

  it('없는 번들이면 상세 경로로 보내 그 화면이 안내하게 한다', async () => {
    renderEdit('99999');

    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/bunches/${bunchId}/bundles/99999`));
    expect(toastAfterNavigation).not.toHaveBeenCalled();
  });

  it('불러오지 못하면 다시 시도할 수 있는 오류 화면을 보인다', async () => {
    server.use(http.get('/api/bunches/:bunchId/bundles/:id', () => fail(500, 'SERVER_ERROR')));
    renderEdit();

    expect(await screen.findByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
  });

  it('오류 화면에서도 헤더 뒤로 가기로 나갈 수 있다', async () => {
    server.use(http.get('/api/bunches/:bunchId/bundles/:id', () => fail(500, 'SERVER_ERROR')));
    renderEdit();

    await userEvent.click(await screen.findByRole('button', { name: '뒤로 가기' }));

    expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
  });
});
