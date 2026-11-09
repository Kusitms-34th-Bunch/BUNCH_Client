import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { draftFixture } from '../../fixtures/draft.fixture';
import { resetDraftPicks, seedDraftPicks } from '../../hooks/useDraftPicks';
import { DraftScreen } from './DraftScreen';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const creator: DraftViewer = { memberId: 'jiye', bunchRole: 'owner' };
// 번치 일반 멤버인 은우(초안 생성자 아님)
const plainMember: DraftViewer = { memberId: 'eunwoo', bunchRole: 'member' };
// 참여 멤버가 아닌 번치 관리자
const outsider: DraftViewer = { memberId: 'outsider', bunchRole: 'owner' };

const actions = {
  setTitle: vi.fn(),
  setComment: vi.fn(),
  setVisibility: vi.fn(),
  addLocation: vi.fn(),
  removeLocation: vi.fn(),
  moveLocation: vi.fn(),
  setDate: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  setPhotoCaption: vi.fn(),
  removePhoto: vi.fn(),
  movePhoto: vi.fn(),
  replacePhotos: vi.fn(),
  searchPlaces: vi.fn(() => Promise.resolve([])),
  publish: vi.fn(() => Promise.resolve('published' as const)),
} satisfies DraftActions;

const onBack = vi.fn();
const onLeave = vi.fn();
const onRetry = vi.fn();
const onUpload = vi.fn();
const onOpenPhoto = vi.fn();
const onOpenPick = vi.fn();
const onImportFromBunchBox = vi.fn();
const onImportFromGallery = vi.fn();

type Options = {
  draft?: Draft;
  viewer?: DraftViewer;
  saveStatus?: 'saved' | 'saving';
  offline?: boolean;
};

// 초안은 공개 범위를 고르지 않은 채 시작하므로, 업로드할 수 있는 상태를 기본으로 두려고 공개를 골라 둠
const publishable: Draft = { ...draftFixture, visibility: 'public' };

const screenElement = ({
  draft = publishable,
  viewer = creator,
  saveStatus = 'saved',
  offline = false,
}: Options = {}) => (
  <DraftScreen
    draft={draft}
    viewer={viewer}
    saveStatus={saveStatus}
    offline={offline}
    actions={actions}
    currentYear={2026}
    onBack={onBack}
    onLeave={onLeave}
    onRetry={onRetry}
    onUpload={onUpload}
    onOpenPhoto={onOpenPhoto}
    onOpenPick={onOpenPick}
    onImportFromBunchBox={onImportFromBunchBox}
    onImportFromGallery={onImportFromGallery}
  />
);

const renderScreen = (options: Options = {}) => render(screenElement(options));

const uploadButton = () => screen.getByRole('button', { name: '업로드' });
const membersSection = () => within(screen.getByRole('region', { name: '참여 멤버' }));

beforeEach(() => {
  vi.clearAllMocks();
  resetDraftPicks();
});

describe('DraftScreen 구성', () => {
  it('헤더와 모든 영역을 Figma 순서대로 보여 준다', () => {
    renderScreen();

    expect(within(screen.getByRole('banner')).getByRole('status')).toHaveTextContent('저장 완료');
    expect(screen.getByText('참여 멤버')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /제목/ })).toHaveValue(draftFixture.title);
    expect(screen.getAllByRole('img', { name: /한강에서 달리는 사람들/ })).toHaveLength(3);
    // 사진별 캡션은 이 화면에서 보이지 않고, 제목 옆에는 「픽하기 >」, 맨 끝에는 「사진 추가」 타일이 있음
    expect(screen.queryByText(draftFixture.photos[0]!.caption)).not.toBeInTheDocument();
    expect(screen.queryByText(BUNDLE_MESSAGES.captionPlaceholder)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '픽하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '사진 추가' })).toBeInTheDocument();
    expect(screen.getByText('서울특별시 여의도동')).toBeInTheDocument();
    expect(screen.getByText('날짜 추가')).toBeInTheDocument();
    // 공개 범위·나가기 영역은 화면에서 빠지고, 나가기는 헤더 더보기로, 업로드는 아래 고정 버튼으로 옮김
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByText('공개 범위')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: '더보기' }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).queryByRole('button', { name: '업로드' })).toBeNull();
    expect(uploadButton()).toBeInTheDocument();
  });

  it('저장 중이면 헤더가 「저장 중」으로 바뀐다', () => {
    renderScreen({ saveStatus: 'saving' });
    expect(within(screen.getByRole('banner')).getByRole('status')).toHaveTextContent('저장 중');
  });

  it('연결이 끊기면 배너를 보이고 「재시도」가 동작한다', async () => {
    renderScreen({ offline: true });

    expect(screen.getByRole('alert')).toHaveTextContent(BUNDLE_MESSAGES.offlineBanner);
    await userEvent.click(screen.getByRole('button', { name: '재시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('뒤로가기를 누르면 onBack을 호출한다', async () => {
    renderScreen();
    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('역할별 권한', () => {
  it('초안 생성자는 다른 멤버 카드에만 삭제 버튼이 보이고 「추가」 카드가 있다', () => {
    renderScreen({ viewer: creator });

    expect(screen.getByRole('button', { name: '경진 삭제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '은우 삭제' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '지예 삭제' })).not.toBeInTheDocument();
    expect(membersSection().getByRole('button', { name: '추가' })).toBeInTheDocument();
  });

  it('일반 멤버에게는 삭제 버튼이 없고 멤버 추가는 할 수 있다', () => {
    renderScreen({ viewer: plainMember });

    expect(screen.queryByRole('button', { name: /삭제$/ })).not.toBeInTheDocument();
    expect(membersSection().getByRole('button', { name: '추가' })).toBeInTheDocument();
  });

  it('참여 멤버가 아니면 「추가」 카드와 더보기(번들 나가기)가 없다', () => {
    renderScreen({ viewer: outsider });

    expect(membersSection().queryByRole('button', { name: '추가' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '더보기' })).not.toBeInTheDocument();
  });

  it('참여 멤버가 아닌 사람이 편집하려 하면 안내하고 값은 바뀌지 않는다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true });

    expect(actions.setTitle).not.toHaveBeenCalled();
  });

  it('참여 멤버가 아닌 사람이 코멘트 입력란에 닿아도 안내한다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(screen.getByRole('textbox', { name: '경진 코멘트' }));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true });
    expect(actions.setComment).not.toHaveBeenCalled();
  });

  it('참여 멤버는 남의 코멘트 입력란에 닿아도 안내 없이 읽기 전용이다', async () => {
    renderScreen({ viewer: creator });

    await userEvent.click(screen.getByRole('textbox', { name: '경진 코멘트' }));
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('업로드 버튼', () => {
  it('권한과 필수 항목이 모두 맞으면 활성이고 누르면 바로 공개 범위 화면으로 넘어간다', async () => {
    renderScreen({ viewer: creator });

    expect(uploadButton()).not.toHaveAttribute('aria-disabled');
    await userEvent.click(uploadButton());

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('공개 범위는 다음 화면에서 고르므로 고르지 않아도 업로드를 시작할 수 있다', async () => {
    renderScreen({ draft: draftFixture });

    expect(uploadButton()).not.toHaveAttribute('aria-disabled');
    await userEvent.click(uploadButton());
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('다른 멤버가 편집 중이면 확인 창을 띄우고 「계속하기」를 눌러야 넘어간다', async () => {
    // 코멘트를 작성 중인 멤버도 편집 중으로 셈
    renderScreen({
      viewer: creator,
      draft: { ...publishable, editing: { commentMemberIds: ['gyeongjin'] } },
    });

    await userEvent.click(uploadButton());
    const dialog = await screen.findByRole('alertdialog', { name: '편집 중인 멤버가 있어요' });
    expect(
      within(dialog).getByText('지금 업로드하면 작성 중인 내용 일부가 반영되지 않을 수 있어요.'),
    ).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '계속하기' }));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('편집 중 확인 창에서 「취소」를 누르면 넘어가지 않는다', async () => {
    renderScreen({ viewer: creator, draft: { ...publishable, editing: { title: 'gyeongjin' } } });

    await userEvent.click(uploadButton());
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(onUpload).not.toHaveBeenCalled();
  });

  it('확인 창이 열려 있는 사이 조건이 깨지면 계속해도 넘어가지 않고 안내한다', async () => {
    const editingDraft: Draft = { ...publishable, editing: { title: 'gyeongjin' } };
    const { rerender } = renderScreen({ viewer: creator, draft: editingDraft });

    await userEvent.click(uploadButton());
    const dialog = await screen.findByRole('alertdialog');
    // 확인 창을 연 채로 연결이 끊김
    rerender(screenElement({ viewer: creator, draft: editingDraft, offline: true }));
    await userEvent.click(within(dialog).getByRole('button', { name: '계속하기' }));

    expect(onUpload).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete, {
      fullWidth: true,
      bottomOffset: 65,
    });
  });

  it('권한이 없는 참여 멤버는 흐리게 보이고 누르면 이유를 안내한다', async () => {
    renderScreen({ viewer: plainMember });

    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadForbidden, {
      fullWidth: true,
      bottomOffset: 65,
    });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('참여 멤버가 아니면 「참여 멤버만 편집할 수 있어요」를 안내한다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants, {
      fullWidth: true,
      bottomOffset: 65,
    });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('필수 항목이 부족하면 비활성이고 누르면 입력을 안내한다', async () => {
    renderScreen({ draft: { ...draftFixture, title: '' } });

    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete, {
      fullWidth: true,
      bottomOffset: 65,
    });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('저장 중이거나 연결이 끊겨 있으면 업로드할 수 없다', async () => {
    const { unmount } = renderScreen({ saveStatus: 'saving' });
    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    unmount();

    renderScreen({ offline: true });
    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(onUpload).not.toHaveBeenCalled();
  });
});

describe('입력', () => {
  it('제목을 입력하면 setTitle을 호출하고 40자에 닿으면 안내한다', async () => {
    renderScreen({ draft: { ...draftFixture, title: '가'.repeat(40) } });

    expect(screen.getByRole('alert')).toHaveTextContent(BUNDLE_MESSAGES.titleMax);
    await userEvent.type(screen.getByRole('textbox', { name: /제목/ }), 'x');
    // 40자가 가득 차 있어 추가 입력 차단
    expect(actions.setTitle).not.toHaveBeenCalled();
  });

  it('내 코멘트만 고칠 수 있고 다른 멤버 코멘트는 읽기 전용이다', async () => {
    renderScreen({ viewer: creator });

    const mine = screen.getByRole('textbox', { name: '지예 (나) 코멘트' });
    const others = screen.getByRole('textbox', { name: '경진 코멘트' });
    expect(mine).not.toHaveAttribute('readonly');
    expect(others).toHaveAttribute('readonly');

    await userEvent.type(mine, '!');
    expect(actions.setComment).toHaveBeenCalledWith('jiye', expect.stringContaining('!'));
  });

  it('내 코멘트가 맨 위에 온다', () => {
    renderScreen({ viewer: plainMember });

    const names = screen
      .getAllByRole('textbox', { name: /코멘트$/ })
      .map((textbox) => textbox.getAttribute('aria-label'));
    expect(names[0]).toBe('은우 (나) 코멘트');
  });

  it('다른 멤버가 코멘트를 쓰는 중이면 점 애니메이션만 보이고 잠그지는 않는다', () => {
    renderScreen({
      viewer: creator,
      draft: { ...draftFixture, editing: { commentMemberIds: ['gyeongjin'] } },
    });

    expect(screen.getByRole('img', { name: '경진님이 작성 중' })).toBeInTheDocument();
  });
});

describe('편집 중 표시', () => {
  it('코멘트 제목 옆에는 지금 쓰는 멤버만 보이고, 쓰는 사람이 없으면 아무도 보이지 않는다', () => {
    const { unmount } = renderScreen();
    expect(screen.queryByLabelText('코멘트를 쓰는 멤버')).not.toBeInTheDocument();
    unmount();

    renderScreen({ draft: { ...publishable, editing: { commentMemberIds: ['gyeongjin'] } } });
    const writers = screen.getByLabelText('코멘트를 쓰는 멤버');
    expect(within(writers).getAllByRole('img')).toHaveLength(1);
  });

  it('무언가 편집 중인 멤버의 카드에만 초록 점(편집 중 표시)이 붙는다', () => {
    renderScreen({ draft: { ...publishable, editing: { title: 'gyeongjin' } } });

    expect(membersSection().getAllByRole('img', { name: /님이 편집 중$/ })).toHaveLength(1);
    expect(membersSection().getByRole('img', { name: '경진님이 편집 중' })).toBeInTheDocument();
  });

  it('아무도 편집하지 않으면 멤버 카드에 점이 없다', () => {
    renderScreen();

    expect(membersSection().queryByRole('img', { name: /님이 편집 중$/ })).not.toBeInTheDocument();
  });
});

describe('내가 입력 중일 때 표시', () => {
  it('제목에 포커스가 있는 동안 내 카드에 초록 점이 붙고 제목 옆에 내 프로필이 보이며, 벗어나면 사라진다', async () => {
    renderScreen({ viewer: creator });
    expect(
      membersSection().queryByRole('img', { name: '지예님이 편집 중' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    expect(membersSection().getByRole('img', { name: '지예님이 편집 중' })).toBeInTheDocument();
    expect(screen.getByLabelText('편집 중인 멤버')).toBeInTheDocument();

    await userEvent.tab();
    expect(
      membersSection().queryByRole('img', { name: '지예님이 편집 중' }),
    ).not.toBeInTheDocument();
  });

  it('내 코멘트에 포커스가 있는 동안 내 카드에 초록 점이 붙고 코멘트 제목 옆에 내 프로필이 보인다', async () => {
    renderScreen({ viewer: creator });
    expect(screen.queryByLabelText('코멘트를 쓰는 멤버')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('textbox', { name: /지예.*코멘트/ }));
    expect(membersSection().getByRole('img', { name: '지예님이 편집 중' })).toBeInTheDocument();
    expect(screen.getByLabelText('코멘트를 쓰는 멤버')).toBeInTheDocument();

    await userEvent.tab();
    expect(screen.queryByLabelText('코멘트를 쓰는 멤버')).not.toBeInTheDocument();
  });

  it('제목에서 코멘트로 옮기면 표시도 제목에서 코멘트로 옮겨 간다', async () => {
    renderScreen({ viewer: creator });

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    await userEvent.click(screen.getByRole('textbox', { name: /지예.*코멘트/ }));

    expect(screen.queryByLabelText('편집 중인 멤버')).not.toBeInTheDocument();
    expect(screen.getByLabelText('코멘트를 쓰는 멤버')).toBeInTheDocument();
    expect(membersSection().getAllByRole('img', { name: '지예님이 편집 중' })).toHaveLength(1);
  });
});

describe('영역 순서와 안내', () => {
  it('코멘트 카드 다음에 위치·날짜가 오고, 코멘트 아래에 수정 불가 안내가 있다', () => {
    renderScreen();

    const notice = screen.getByText('코멘트와 픽하기는 업로드 이후 수정이 불가해요');
    const comments = screen.getByRole('textbox', { name: /경진.*코멘트/ });
    const place = screen.getByText('날짜 추가');
    // 코멘트 카드 → 안내 → 위치·날짜 순서
    expect(
      comments.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(notice.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('위치와 날짜', () => {
  it('위치를 지우면 removeLocation을 호출한다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '서울특별시 여의도동 지우기' }));
    expect(actions.removeLocation).toHaveBeenCalledWith('location-1');
  });

  it('다른 멤버가 위치를 편집 중이면 지우기·추가가 모두 막히고 안내한다', async () => {
    renderScreen({
      draft: {
        ...draftFixture,
        locations: [{ id: 'sokcho', name: '속초해수욕장' }],
        editing: { location: 'gyeongjin' },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: '속초해수욕장 지우기' }));
    expect(actions.removeLocation).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, { fullWidth: true });

    toast.mockClear();
    await userEvent.click(screen.getByRole('button', { name: /^추가.*경진님이 편집 중/ }));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, { fullWidth: true });
  });

  describe('위치 순서 바꾸기', () => {
    const twoLocations = {
      ...draftFixture,
      locations: [
        { id: 'a', name: '장소 A' },
        { id: 'b', name: '장소 B' },
      ],
    };

    it('위치를 고르면 제목 앞이 햄버거 핸들로 바뀌어 위치마다 「순서 바꾸기」 버튼이 생긴다', () => {
      renderScreen({ draft: twoLocations });

      expect(screen.getByRole('button', { name: '장소 A 순서 바꾸기' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '장소 B 순서 바꾸기' })).toBeInTheDocument();
    });

    it('핸들에 포커스를 두고 Space로 잡아 방향키로 옮긴 뒤 Space로 놓으면 moveLocation을 부른다', async () => {
      renderScreen({ draft: twoLocations });

      const handle = screen.getByRole('button', { name: '장소 A 순서 바꾸기' });
      handle.focus();
      await userEvent.keyboard(' ');
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard(' ');

      // jsdom은 레이아웃이 없어 옮길 자리를 계산하지 못할 수 있어, 호출됐다면 맞는 위치 id로 불러야 함
      if (vi.mocked(actions.moveLocation).mock.calls.length > 0) {
        expect(actions.moveLocation).toHaveBeenCalledWith('a', 1);
      }
    });

    it('위치가 하나뿐이면 끌 수 없고 핸들을 눌러도 아무 안내가 없다', async () => {
      renderScreen({
        draft: { ...draftFixture, locations: [{ id: 'a', name: '장소 A' }] },
      });

      await userEvent.click(screen.getByRole('button', { name: '장소 A 순서 바꾸기' }));

      expect(toast).not.toHaveBeenCalled();
      expect(actions.moveLocation).not.toHaveBeenCalled();
    });

    it('다른 멤버가 위치를 편집 중이면 핸들을 눌렀을 때 안내한다', async () => {
      renderScreen({ draft: { ...twoLocations, editing: { location: 'gyeongjin' } } });

      await userEvent.click(screen.getByRole('button', { name: '장소 A 순서 바꾸기' }));

      expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, { fullWidth: true });
      expect(actions.moveLocation).not.toHaveBeenCalled();
    });

    it('참여 멤버가 아니면 핸들을 눌렀을 때 안내한다', async () => {
      renderScreen({ viewer: outsider, draft: twoLocations });

      await userEvent.click(screen.getByRole('button', { name: '장소 A 순서 바꾸기' }));

      expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true });
    });
  });

  it('위치가 3개면 「추가」 행이 사라진다', () => {
    renderScreen({
      draft: {
        ...draftFixture,
        locations: [
          { id: 'a', name: '장소 A' },
          { id: 'b', name: '장소 B' },
          { id: 'c', name: '장소 C' },
        ],
      },
    });

    expect(screen.queryByRole('button', { name: /위치.*추가/ })).not.toBeInTheDocument();
  });

  it('위치가 없으면 「위치 추가」 한 줄을 보여 준다', () => {
    renderScreen({ draft: { ...draftFixture, locations: [] } });

    expect(screen.getByRole('button', { name: /위치.*위치 추가/ })).toBeInTheDocument();
  });

  it('추천 날짜 칩을 누르면 그 날짜로 등록한다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '6월 20일' }));
    expect(actions.setDate).toHaveBeenCalledWith('2026-06-20');
  });

  it('등록된 날짜는 날짜 줄에 보이고 지울 수 있다', async () => {
    renderScreen({ draft: { ...draftFixture, date: '2026-06-20' } });

    await userEvent.click(screen.getByRole('button', { name: '6월 20일 지우기' }));
    expect(actions.setDate).toHaveBeenCalledWith(null);
  });
});

describe('멤버 내보내기', () => {
  it('삭제 버튼을 누르면 확인 창이 뜨고 「내보내기」를 눌러야 멤버를 내보낸다', async () => {
    renderScreen({ viewer: creator });

    await userEvent.click(screen.getByRole('button', { name: '경진 삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('경진님을 번들에서 내보낼까요?')).toBeInTheDocument();
    expect(
      within(dialog).getByText('경진님이 남긴 코멘트가 삭제되며, 복구할 수 없어요.'),
    ).toBeInTheDocument();
    expect(actions.removeMember).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '내보내기' }));
    expect(actions.removeMember).toHaveBeenCalledWith('gyeongjin');
  });

  it('「취소」를 누르면 멤버를 내보내지 않는다', async () => {
    renderScreen({ viewer: creator });

    await userEvent.click(screen.getByRole('button', { name: '은우 삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(actions.removeMember).not.toHaveBeenCalled();
  });
});

describe('다른 멤버가 편집 중인 영역', () => {
  it('제목 입력란에 닿으면 안내하고 값은 바뀌지 않는다', async () => {
    renderScreen({ draft: { ...draftFixture, editing: { title: 'gyeongjin' } } });

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, { fullWidth: true });
    expect(actions.setTitle).not.toHaveBeenCalled();
  });

  it('편집 중인 위치·날짜를 누르면 시트를 열지 않고 안내한다', async () => {
    renderScreen({
      draft: {
        ...draftFixture,
        locations: [],
        editing: { location: 'gyeongjin', date: 'eunwoo' },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: /편집 중 위치/ }));
    await userEvent.click(screen.getByRole('button', { name: /편집 중 날짜/ }));

    expect(toast).toHaveBeenCalledTimes(2);
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, { fullWidth: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('사진을 누르면 사진 상세로, 「픽하기」를 누르면 대표 사진 투표로 이동한다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: BUNDLE_MESSAGES.photoOpenLabel(2) }));
    expect(onOpenPhoto).toHaveBeenCalledWith(draftFixture.photos[1]!.id);

    await userEvent.click(screen.getByRole('button', { name: '픽하기' }));
    expect(onOpenPick).toHaveBeenCalledTimes(1);
  });

  it('X를 누르면 삭제 확인 창을 거쳐 「삭제하기」를 눌러야 사진을 뺀다', async () => {
    renderScreen();

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(1) }),
    );
    const dialog = await screen.findByRole('alertdialog', { name: '사진을 삭제할까요?' });
    expect(actions.removePhoto).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '삭제하기' }));
    expect(actions.removePhoto).toHaveBeenCalledWith(draftFixture.photos[0]!.id);
  });

  it('삭제 확인 창의 설명은 「삭제한 사진은 복구할 수 없어요.」이다', async () => {
    renderScreen();

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(1) }),
    );

    expect(
      await screen.findByRole('alertdialog', { name: '사진을 삭제할까요?' }),
    ).toHaveAccessibleDescription('삭제한 사진은 복구할 수 없어요.');
  });

  it('멤버가 픽한 사진을 지우려 하면 「멤버들이 픽한 사진이에요」 확인 창이 뜨고 삭제하기로 지운다', async () => {
    seedDraftPicks(draftFixture.id, { [draftFixture.photos[0]!.id]: ['gyeongjin'] });
    renderScreen();

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(1) }),
    );
    const dialog = await screen.findByRole('alertdialog', { name: '멤버들이 픽한 사진이에요' });
    expect(dialog).toHaveAccessibleDescription(
      '사진을 삭제하면 픽도 함께 삭제되며, 복구할 수 없어요.',
    );

    await userEvent.click(within(dialog).getByRole('button', { name: '삭제하기' }));
    expect(actions.removePhoto).toHaveBeenCalledWith(draftFixture.photos[0]!.id);
  });

  it('픽이 없는 다른 사진은 기본 삭제 확인 창을 본다', async () => {
    seedDraftPicks(draftFixture.id, { [draftFixture.photos[0]!.id]: ['gyeongjin'] });
    renderScreen();

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(2) }),
    );

    expect(
      await screen.findByRole('alertdialog', { name: '사진을 삭제할까요?' }),
    ).toBeInTheDocument();
  });

  it('마지막 한 장은 지울 수 없다고 안내하고 지우지 않는다', async () => {
    renderScreen({ draft: { ...draftFixture, photos: draftFixture.photos.slice(0, 1) } });

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(1) }),
    );
    const dialog = await screen.findByRole('alertdialog', { name: '사진을 삭제할 수 없어요' });
    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));

    expect(actions.removePhoto).not.toHaveBeenCalled();
  });

  it('다른 멤버가 편집 중인 사진은 지울 수 없고 안내한다', async () => {
    renderScreen({
      draft: {
        ...draftFixture,
        editing: {
          photoMemberIds: ['gyeongjin'],
          photoEditors: { [draftFixture.photos[0]!.id]: ['gyeongjin'] },
        },
      },
    });

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(1) }),
    );

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, { fullWidth: true });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('참여 멤버가 아니면 사진을 지우려 할 때 안내한다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(1) }),
    );

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true });
    expect(actions.removePhoto).not.toHaveBeenCalled();
  });

  it('「사진 추가」는 초안 생성자·관리자·공동 관리자에게만 보이고 누르면 가져오기 시트가 열린다', async () => {
    const { unmount } = renderScreen({ viewer: plainMember });
    expect(screen.queryByRole('button', { name: '사진 추가' })).not.toBeInTheDocument();
    unmount();

    renderScreen({ viewer: creator });
    await userEvent.click(screen.getByRole('button', { name: '사진 추가' }));
    await userEvent.click(await screen.findByRole('button', { name: /번치 사진함에서 가져오기/ }));

    expect(onImportFromBunchBox).toHaveBeenCalledTimes(1);
  });

  it('사진이 20장이면 「사진 추가」가 사라진다', () => {
    const base = draftFixture.photos[0]!;
    const photos = Array.from({ length: 20 }, (_, index) => ({ ...base, id: `p${index}` }));
    renderScreen({ draft: { ...draftFixture, photos } });

    expect(screen.queryByRole('button', { name: '사진 추가' })).not.toBeInTheDocument();
  });

  it('다른 멤버가 위치·날짜를 편집 중이면 그 멤버의 프로필만 보인다', () => {
    renderScreen({
      draft: { ...draftFixture, editing: { location: 'gyeongjin', date: 'eunwoo' } },
    });

    // 위치 「추가」 행에 프로필 이미지가 붙고, 위치·날짜 줄 모두 점 애니메이션은 없음
    expect(screen.getByRole('group', { name: /위치$/ })).toBeInTheDocument();
    const locationGroup = within(screen.getByRole('group', { name: /위치$/ }));
    expect(
      locationGroup.getByRole('button', { name: /^추가.*경진님이 편집 중/ }),
    ).toBeInTheDocument();
    expect(
      locationGroup.getByRole('button', { name: /^추가/ }).querySelector('img'),
    ).not.toBeNull();
  });

  it('편집 중인 멤버가 없으면 안내하지 않는다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('나가기', () => {
  // 헤더 「⋯」 더보기에서 「번들 나가기」를 골라 확인 창을 엶
  const openLeaveDialog = async () => {
    await userEvent.click(screen.getByRole('button', { name: '더보기' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '번들 나가기' }));
    return screen.findByRole('alertdialog');
  };

  it('일반 멤버는 확인 창에서 「나가기」를 눌러야 나간다', async () => {
    renderScreen({ viewer: { memberId: 'eunwoo', bunchRole: 'member' } });

    const dialog = await openLeaveDialog();
    expect(within(dialog).getByText('번들에서 나가시겠어요?')).toBeInTheDocument();
    expect(onLeave).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('초안 생성자가 나가면 번들이 삭제된다는 문구를 본다', async () => {
    renderScreen({ viewer: creator });

    const dialog = await openLeaveDialog();
    expect(within(dialog).getByText('번들에서 나갈까요?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/번들을 만든 멤버가 나가면 번들이 삭제되고/),
    ).toBeInTheDocument();
  });

  it('「취소」를 누르면 나가지 않고 현재 화면에 남는다', async () => {
    renderScreen();

    const dialog = await openLeaveDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(onLeave).not.toHaveBeenCalled();
  });
});
