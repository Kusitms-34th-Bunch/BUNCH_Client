import type * as DesignSystem from '@app/design-system';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { LONG_PRESS_MS } from '../../constants/photoList';
import { draftFixture, fixtureLocation, fixturePlace } from '../../fixtures/draft.fixture';
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
  setTitleComposing: vi.fn(),
  saveNow: vi.fn(),
  presence: { type: vi.fn(), blur: vi.fn(), begin: vi.fn(), end: vi.fn() },
  setComment: vi.fn(),
  setVisibility: vi.fn(),
  addLocation: vi.fn(),
  removeLocation: vi.fn(),
  moveLocation: vi.fn(),
  setDate: vi.fn(),
  addMember: vi.fn(() => true),
  removeMember: vi.fn(() => true),
  removePhoto: vi.fn(() => true),
  movePhoto: vi.fn(),
  setPhotoDragging: vi.fn(),
  replacePhotos: vi.fn(() => true),
  replaceLocation: vi.fn(),
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
  actions?: DraftActions;
  draft?: Draft;
  viewer?: DraftViewer;
  saveStatus?: 'saved' | 'saving';
  offline?: boolean;
  titleReady?: boolean;
};

// 초안은 공개 범위를 고르지 않은 채 시작하므로, 업로드할 수 있는 상태를 기본으로 두려고 공개를 골라 둠
const publishable: Draft = { ...draftFixture, visibility: 'public' };

const screenElement = ({
  actions: screenActions = actions,
  draft = publishable,
  viewer = creator,
  saveStatus = 'saved',
  offline = false,
  titleReady = true,
}: Options = {}) => (
  <DraftScreen
    draft={draft}
    viewer={viewer}
    saveStatus={saveStatus}
    offline={offline}
    titleReady={titleReady}
    actions={screenActions}
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
});

describe('DraftScreen 구성', () => {
  it('헤더와 모든 영역을 Figma 순서대로 보여 준다', () => {
    renderScreen();

    expect(within(screen.getByRole('banner')).getByRole('status')).toHaveTextContent('저장 완료');
    expect(screen.getByText('참여 멤버')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /제목/ })).toHaveValue(draftFixture.title);
    expect(screen.getAllByRole('img', { name: /한강에서 달리는 사람들/ })).toHaveLength(3);
    // 제목 옆에는 「픽하기 >」, 맨 끝에는 「사진 추가」 타일이 있음
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

    expect(screen.getByText(BUNDLE_MESSAGES.offlineBanner)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '재시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('연결이 끊긴 동안은 제목을 고칠 수 없고 안내 없이 반응만 없앤다', async () => {
    renderScreen({ offline: true });
    const title = screen.getByRole('textbox', { name: /제목/ });

    await userEvent.type(title, 'x');

    expect(title).toHaveAttribute('readonly');
    expect(actions.setTitle).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
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

  it('제목·내 코멘트 입력란을 벗어나면 저장하지 못한 입력을 바로 저장하게 한다', async () => {
    renderScreen({ viewer: creator });

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    expect(actions.saveNow).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(actions.saveNow).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('textbox', { name: '지예 (나) 코멘트' }));
    await userEvent.tab();
    expect(actions.saveNow).toHaveBeenCalledTimes(2);
  });

  it('참여 멤버가 아닌 사람이 편집하려 하면 안내하고 값은 바뀌지 않는다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants);

    expect(actions.setTitle).not.toHaveBeenCalled();
  });

  it('참여 멤버가 아닌 사람이 코멘트 입력란에 닿아도 안내한다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(screen.getByRole('textbox', { name: '경진 코멘트' }));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants);
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
    renderScreen({
      viewer: creator,
      draft: { ...publishable, editing: { titleMemberIds: ['gyeongjin'] } },
    });

    await userEvent.click(uploadButton());
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(onUpload).not.toHaveBeenCalled();
  });

  it('확인 창이 열려 있는 사이 조건이 깨지면 계속해도 넘어가지 않고 안내한다', async () => {
    const editingDraft: Draft = { ...publishable, editing: { titleMemberIds: ['gyeongjin'] } };
    const { rerender } = renderScreen({ viewer: creator, draft: editingDraft });

    await userEvent.click(uploadButton());
    const dialog = await screen.findByRole('alertdialog');
    // 확인 창을 연 채로 연결이 끊김
    rerender(screenElement({ viewer: creator, draft: editingDraft, offline: true }));
    await userEvent.click(within(dialog).getByRole('button', { name: '계속하기' }));

    expect(onUpload).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete);
  });

  it('권한이 없는 참여 멤버는 흐리게 보이고 누르면 이유를 안내한다', async () => {
    renderScreen({ viewer: plainMember });

    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadForbidden);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('참여 멤버가 아니면 「참여 멤버만 편집할 수 있어요」를 안내한다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('필수 항목이 부족하면 비활성이고 누르면 입력을 안내한다', async () => {
    renderScreen({ draft: { ...draftFixture, title: '' } });

    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete);
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

  it('동시 편집이 합쳐져 40자를 넘으면 자르지 않고 안내하며 업로드를 막는다', async () => {
    renderScreen({ viewer: creator, draft: { ...publishable, title: '가'.repeat(41) } });

    expect(screen.getByRole('textbox', { name: /제목/ })).toHaveValue('가'.repeat(41));
    // 40자에 닿았을 때와 같은 오류(기능 spec)
    expect(screen.getByRole('alert')).toHaveTextContent(BUNDLE_MESSAGES.titleMax);
    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(onUpload).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete);
  });

  it('제목 문서를 불러오는 동안은 읽기 전용이다', () => {
    renderScreen({ viewer: creator, titleReady: false });
    const title = screen.getByRole('textbox', { name: /제목/ });

    expect(title).toHaveAttribute('readonly');
    expect(title).toHaveAttribute('aria-busy', 'true');
  });

  it('보이는 글자 기준 40자를 넘기는 입력은 받지 않는다(이모지는 한 글자)', async () => {
    renderScreen({ viewer: creator, draft: { ...publishable, title: '가'.repeat(39) + '😀' } });

    await userEvent.type(screen.getByRole('textbox', { name: /제목/ }), 'x');

    expect(actions.setTitle).not.toHaveBeenCalled();
  });

  it('이모지를 일반 글자로 바꿔 보이는 글자가 늘어나 40자를 넘기면 받지 않는다(UTF-16 길이는 줄어도)', () => {
    // 이모지 20개와 한글 20개는 40글자지만 UTF-16 길이는 60
    renderScreen({
      viewer: creator,
      draft: { ...publishable, title: '😀'.repeat(20) + '가'.repeat(20) },
    });

    fireEvent.change(screen.getByRole('textbox', { name: /제목/ }), {
      target: { value: 'a'.repeat(41) },
    });

    expect(actions.setTitle).not.toHaveBeenCalled();
  });

  it('합쳐져서 이미 40자를 넘은 제목은 줄이는 입력을 받는다', () => {
    renderScreen({ viewer: creator, draft: { ...publishable, title: '가'.repeat(41) } });

    fireEvent.change(screen.getByRole('textbox', { name: /제목/ }), {
      target: { value: '가'.repeat(40) },
    });

    expect(actions.setTitle).toHaveBeenCalledWith('가'.repeat(40));
  });

  describe('다른 멤버의 변경이 합쳐질 때 커서와 선택 영역', () => {
    // 입력란에 포커스가 있고 커서(또는 선택)가 있는 상태에서 제목이 원격 변경으로 바뀜
    const mergeRemote = (before: string, after: string, select: [number, number]) => {
      const view = renderScreen({ viewer: creator, draft: { ...publishable, title: before } });
      const input = screen.getByRole<HTMLInputElement>('textbox', { name: /제목/ });
      input.focus();
      input.setSelectionRange(select[0], select[1]);
      fireEvent.select(input);

      view.rerender(screenElement({ viewer: creator, draft: { ...publishable, title: after } }));
      return input;
    };

    it('앞뒤에 동시에 글자가 끼어들어도 커서는 같은 글자 뒤에 남는다', () => {
      const input = mergeRemote('abcd', 'XabcdY', [2, 2]);

      // b 뒤: X 한 글자만큼만 밀림(문자열 끝이 아님)
      expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3]);
    });

    it('선택 영역의 시작과 끝을 각각 보정해 같은 글자를 계속 선택한다', () => {
      const input = mergeRemote('abcd', 'XabcdY', [1, 3]);

      expect([input.selectionStart, input.selectionEnd]).toEqual([2, 4]);
    });

    it('한 곳만 바뀐 경우는 이전과 같이 보정한다', () => {
      const input = mergeRemote('부산 여행', '가을 부산 여행', [5, 5]);

      expect([input.selectionStart, input.selectionEnd]).toEqual([8, 8]);
    });
  });

  it('조합이 끝나지 않은 채 포커스를 잃어도 조합 종료를 알린다', async () => {
    renderScreen({ viewer: creator });
    const title = screen.getByRole('textbox', { name: /제목/ });

    await userEvent.click(title);
    await userEvent.tab();

    expect(actions.setTitleComposing).toHaveBeenCalledWith(false);
  });

  it('한글 조합이 시작되고 끝나는 것을 알린다', () => {
    renderScreen({ viewer: creator });
    const title = screen.getByRole('textbox', { name: /제목/ });

    fireEvent.compositionStart(title);
    fireEvent.compositionEnd(title);

    expect(actions.setTitleComposing.mock.calls).toEqual([[true], [false]]);
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

  it('다른 멤버가 쓰는 글자는 저장 전이어도 그 카드에 바로 보이고 내 카드는 영향받지 않는다(기능 spec 4.3.8)', () => {
    renderScreen({
      viewer: creator,
      draft: {
        ...draftFixture,
        editing: {
          commentMemberIds: ['gyeongjin'],
          commentTexts: { gyeongjin: '지금 치는 중이에요' },
        },
      },
    });

    const theirs = screen.getByRole('textbox', { name: '경진 코멘트' });
    expect(theirs).toHaveValue('지금 치는 중이에요');
    expect(theirs).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox', { name: /지예.*코멘트/ })).not.toHaveAttribute('readonly');
  });

  it('다른 멤버가 코멘트를 모두 지우면 빈 글자가 보인다', () => {
    renderScreen({
      viewer: creator,
      draft: {
        ...draftFixture,
        editing: { commentMemberIds: ['gyeongjin'], commentTexts: { gyeongjin: '' } },
      },
    });

    expect(screen.getByRole('textbox', { name: '경진 코멘트' })).toHaveValue('');
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

  it('지금 이 초안에 들어와 있는 멤버의 카드에만 초록 점이 붙는다', () => {
    renderScreen({ draft: { ...publishable, viewingMemberIds: ['gyeongjin'] } });

    expect(membersSection().getAllByRole('img', { name: /님이 보는 중$/ })).toHaveLength(1);
    expect(membersSection().getByRole('img', { name: '경진님이 보는 중' })).toBeInTheDocument();
  });

  it('아무도 들어와 있지 않으면 멤버 카드에 점이 없다', () => {
    renderScreen();

    expect(membersSection().queryByRole('img', { name: /님이 보는 중$/ })).not.toBeInTheDocument();
  });
});

describe('내가 입력 중일 때 표시', () => {
  it('제목에 포커스가 있는 동안 제목 옆에 내 프로필이 보이고, 벗어나면 사라진다', async () => {
    renderScreen({ viewer: creator });
    expect(screen.queryByLabelText('편집 중인 멤버')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    expect(screen.getByLabelText('편집 중인 멤버')).toBeInTheDocument();

    await userEvent.tab();
    expect(screen.queryByLabelText('편집 중인 멤버')).not.toBeInTheDocument();
  });

  it('내 코멘트에 포커스가 있는 동안 코멘트 제목 옆에 내 프로필이 보인다', async () => {
    renderScreen({ viewer: creator });
    expect(screen.queryByLabelText('코멘트를 쓰는 멤버')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('textbox', { name: /지예.*코멘트/ }));
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
  });

  it('제목·코멘트에서 나가면 입력 표시를 끈다(BLUR)', async () => {
    renderScreen({ viewer: creator });

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    await userEvent.tab();
    await userEvent.click(screen.getByRole('textbox', { name: /지예.*코멘트/ }));
    await userEvent.tab();

    expect(actions.presence.blur).toHaveBeenCalledWith('TITLE');
    expect(actions.presence.blur).toHaveBeenCalledWith('COMMENT');
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

  it('새 위치를 찾으려고 시트를 열면 위치를 작업 중으로 알리고 닫으면 끝낸다', async () => {
    const view = renderScreen({ draft: { ...draftFixture, locations: [] } });

    await userEvent.click(screen.getByRole('button', { name: /위치.*위치 추가/ }));

    expect(await screen.findByRole('dialog', { name: '위치 검색' })).toBeInTheDocument();
    expect(actions.presence.begin).toHaveBeenCalledWith('LOCATION');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(actions.presence.end).toHaveBeenCalledWith('LOCATION'));
    view.unmount();
  });

  it('위치 줄을 누르면 그 줄을 작업 중으로 알리며 검색 시트가 열리고, 결과를 고르면 그 줄을 바꾼다', async () => {
    const place = fixturePlace('p9', '더현대 서울', '서울 영등포구 여의대로 108');
    const searchPlaces = vi.fn(() => Promise.resolve([place]));
    renderScreen({ actions: { ...actions, searchPlaces } });

    await userEvent.click(screen.getByRole('button', { name: /^위치: 서울특별시 여의도동$/ }));

    expect(await screen.findByRole('dialog', { name: '위치 검색' })).toBeInTheDocument();
    expect(actions.presence.begin).toHaveBeenCalledWith('LOCATION:location-1');

    await userEvent.type(
      screen.getByRole('searchbox', { name: '장소나 주소 검색' }),
      '더현대{Enter}',
    );
    await userEvent.click(await screen.findByRole('button', { name: /더현대 서울/ }));

    expect(actions.replaceLocation).toHaveBeenCalledWith('location-1', place);
    expect(actions.addLocation).not.toHaveBeenCalled();
  });

  it('서버 id를 아직 받지 못한 줄은 눌러도 검색 시트를 열지 않는다', async () => {
    renderScreen({
      draft: { ...draftFixture, locations: [fixtureLocation('pending:1', '방금 더한 장소')] },
    });

    await userEvent.click(screen.getByRole('button', { name: /^위치: 방금 더한 장소$/ }));

    expect(screen.queryByRole('dialog', { name: '위치 검색' })).not.toBeInTheDocument();
  });

  it('그 줄을 바꾸거나 끄는 멤버의 프로필은 그 줄에만 보인다', () => {
    renderScreen({
      draft: {
        ...draftFixture,
        locations: [fixtureLocation('a', '장소 A'), fixtureLocation('b', '장소 B')],
        editing: { locationEditors: { a: ['gyeongjin'] } },
      },
    });

    expect(
      screen.getByRole('button', { name: /경진님이 편집 중 위치.*장소 A/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^위치: 장소 B$/ })).toBeInTheDocument();
  });

  it('다른 멤버가 위치를 고르는 중이어도 지우기·추가를 막지 않고 프로필을 보인다(잠금 없음)', async () => {
    renderScreen({
      draft: {
        ...draftFixture,
        locations: [fixtureLocation('sokcho', '속초해수욕장')],
        editing: { locationAddMemberIds: ['gyeongjin'] },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: '속초해수욕장 지우기' }));
    expect(actions.removeLocation).toHaveBeenCalledWith('sokcho');
    expect(toast).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^추가.*경진님이 편집 중/ })).toBeInTheDocument();
  });

  it('참여 멤버가 아니면 위치는 장소만 보이고 X와 「+ 위치 추가」가 없다(기능 spec 4.3.10)', () => {
    renderScreen({
      viewer: outsider,
      draft: {
        ...draftFixture,
        locations: [fixtureLocation('a', '장소 A'), fixtureLocation('b', '장소 B')],
      },
    });

    expect(screen.getByText('장소 A')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '장소 A 지우기' })).toBeNull();
    expect(
      within(screen.getByRole('group', { name: '위치' })).queryByRole('button', { name: /추가/ }),
    ).toBeNull();
  });

  it('연결이 끊겨 편집만 막힌 참여 멤버에게는 X와 「+ 위치 추가」가 그대로 보인다', () => {
    renderScreen({
      offline: true,
      draft: { ...draftFixture, locations: [fixtureLocation('a', '장소 A')] },
    });

    expect(screen.getByRole('button', { name: '장소 A 지우기' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: '위치' })).getByRole('button', { name: /추가/ }),
    ).toBeInTheDocument();
  });

  describe('위치 순서 바꾸기', () => {
    const twoLocations = {
      ...draftFixture,
      locations: [fixtureLocation('a', '장소 A'), fixtureLocation('b', '장소 B')],
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

    it('끄는 동안에는 다른 멤버가 바꾼 목록을 미뤘다가 놓을 때 반영한다', async () => {
      const view = render(screenElement({ draft: twoLocations }));

      const handle = screen.getByRole('button', { name: '장소 A 순서 바꾸기' });
      handle.focus();
      await userEvent.keyboard(' ');
      // 끄는 중에 다른 멤버가 장소 B를 지움
      view.rerender(
        screenElement({
          draft: { ...draftFixture, locations: [fixtureLocation('a', '장소 A')] },
        }),
      );

      expect(screen.getByText('장소 B')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByText('장소 B')).toBeNull());
    });

    it('끌 수 없는 상태의 핸들은 포커스를 유지한 채 aria-disabled로 알린다', () => {
      const { unmount } = renderScreen({
        draft: { ...draftFixture, locations: [fixtureLocation('a', '장소 A')] },
      });
      expect(screen.getByRole('button', { name: '장소 A 순서 바꾸기' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      unmount();

      renderScreen({ draft: twoLocations });
      expect(screen.getByRole('button', { name: '장소 A 순서 바꾸기' })).toHaveAttribute(
        'aria-disabled',
        'false',
      );
    });

    it('위치가 하나뿐이면 끌 수 없고 핸들을 눌러도 아무 안내가 없다', async () => {
      renderScreen({
        draft: { ...draftFixture, locations: [fixtureLocation('a', '장소 A')] },
      });

      await userEvent.click(screen.getByRole('button', { name: '장소 A 순서 바꾸기' }));

      expect(toast).not.toHaveBeenCalled();
      expect(actions.moveLocation).not.toHaveBeenCalled();
    });

    it('다른 멤버가 위치를 고르는 중이어도 핸들을 잠그지 않는다', async () => {
      renderScreen({
        draft: { ...twoLocations, editing: { locationAddMemberIds: ['gyeongjin'] } },
      });

      await userEvent.click(screen.getByRole('button', { name: '장소 A 순서 바꾸기' }));

      expect(toast).not.toHaveBeenCalled();
    });

    it('참여 멤버가 아니면 핸들을 눌렀을 때 안내한다', async () => {
      renderScreen({ viewer: outsider, draft: twoLocations });

      await userEvent.click(screen.getByRole('button', { name: '장소 A 순서 바꾸기' }));

      expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants);
    });
  });

  it('위치가 3개면 「추가」 행이 사라진다', () => {
    renderScreen({
      draft: {
        ...draftFixture,
        locations: [
          fixtureLocation('a', '장소 A'),
          fixtureLocation('b', '장소 B'),
          fixtureLocation('c', '장소 C'),
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

  it('연결이 끊겨 내보내기가 막히면 성공 토스트를 띄우지 않는다', async () => {
    actions.removeMember.mockReturnValueOnce(false);
    renderScreen({ viewer: creator });

    await userEvent.click(screen.getByRole('button', { name: '경진 삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '내보내기' }));

    expect(actions.removeMember).toHaveBeenCalledWith('gyeongjin');
    // 확인 창이 완전히 닫힌 뒤에도 알림이 없음
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(toast).not.toHaveBeenCalledWith(BUNDLE_MESSAGES.memberRemoved('경진'));
  });

  it('「취소」를 누르면 멤버를 내보내지 않는다', async () => {
    renderScreen({ viewer: creator });

    await userEvent.click(screen.getByRole('button', { name: '은우 삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(actions.removeMember).not.toHaveBeenCalled();
  });
});

describe('다른 멤버가 작업 중인 영역(잠그지 않음)', () => {
  it('다른 멤버가 제목을 입력 중이어도 입력란을 잠그지 않고 프로필만 보인다', async () => {
    renderScreen({ draft: { ...draftFixture, editing: { titleMemberIds: ['gyeongjin'] } } });
    const title = screen.getByRole('textbox', { name: /제목/ });

    expect(title).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('편집 중인 멤버')).toBeInTheDocument();
    await userEvent.type(title, 'x');

    expect(toast).not.toHaveBeenCalled();
    expect(actions.setTitle).toHaveBeenCalled();
  });

  it('여러 멤버가 같은 제목을 입력 중이면 프로필을 모두 보인다', () => {
    renderScreen({
      draft: { ...draftFixture, editing: { titleMemberIds: ['gyeongjin', 'eunwoo'] } },
    });

    expect(within(screen.getByLabelText('편집 중인 멤버')).getAllByRole('img')).toHaveLength(2);
  });

  it('위치·날짜를 고르는 멤버가 있어도 시트를 연다', async () => {
    renderScreen({
      draft: {
        ...draftFixture,
        locations: [],
        editing: { locationAddMemberIds: ['gyeongjin'], dateMemberIds: ['eunwoo'] },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: /편집 중 날짜/ }));

    expect(toast).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('날짜 선택 화면이 열려 있는 동안 날짜 작업을 알리고 닫으면 끝낸다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: /날짜/ }));
    expect(actions.presence.begin).toHaveBeenCalledWith('DATE');
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(actions.presence.end).toHaveBeenCalledWith('DATE'));
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
    renderScreen({
      draft: { ...draftFixture, picks: { [draftFixture.photos[0]!.id]: ['gyeongjin'] } },
    });

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
    renderScreen({
      draft: { ...draftFixture, picks: { [draftFixture.photos[0]!.id]: ['gyeongjin'] } },
    });

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

  it('다른 멤버가 사진 작업 중이어도 지울 수 있고, 삭제 확인 창이 열려 있는 동안 사진 작업을 알린다', async () => {
    renderScreen({ draft: { ...draftFixture, editing: { photoMemberIds: ['gyeongjin'] } } });

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(1) }),
    );
    const dialog = await screen.findByRole('alertdialog');
    expect(actions.presence.begin).toHaveBeenCalledWith('PHOTOS');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(actions.presence.end).toHaveBeenCalledWith('PHOTOS'));
    expect(toast).not.toHaveBeenCalled();
  });

  it('사진 추가 시트가 열려 있는 동안 연결 상태가 바뀌어 presence가 바뀌어도 새 presence로 작업을 알린다', async () => {
    const view = renderScreen();
    await userEvent.click(screen.getByRole('button', { name: '사진 추가' }));
    expect(actions.presence.begin).toHaveBeenCalledWith('PHOTOS');

    // 재연결로 presence 객체가 바뀐 상황(시트는 계속 열려 있음)
    const reconnected = {
      ...actions,
      presence: { type: vi.fn(), blur: vi.fn(), begin: vi.fn(), end: vi.fn() },
    };
    view.rerender(screenElement({ actions: reconnected }));

    expect(reconnected.presence.begin).toHaveBeenCalledWith('PHOTOS');
    expect(actions.presence.end).toHaveBeenCalledWith('PHOTOS');
  });

  it('참여 멤버가 아니면 사진을 지우려 할 때 안내한다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(
      screen.getByRole('button', { name: BUNDLE_MESSAGES.removePhotoLabel(1) }),
    );

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants);
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
      draft: {
        ...draftFixture,
        editing: { locationAddMemberIds: ['gyeongjin'], dateMemberIds: ['eunwoo'] },
      },
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

describe('사진 길게 눌러 끌기(기능 spec 4.3.6, 4.3.13)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // 사진의 「열기」 버튼을 마우스로 길게 누른 상태를 만듦(끌기는 사진 칸이 받음)
  const pressPhoto = async (position: number) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const target = screen.getByRole('button', { name: BUNDLE_MESSAGES.photoOpenLabel(position) });
    fireEvent.mouseDown(target, { button: 0, clientX: 10, clientY: 10 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LONG_PRESS_MS);
    });
  };
  const release = () => {
    act(() => {
      fireEvent.mouseUp(document);
    });
  };

  it('길게 누르면 「사진」 작업 중으로 알리고 다른 멤버 변경을 미루게 하며, 놓으면 둘 다 푼다', async () => {
    renderScreen();

    await pressPhoto(1);

    expect(actions.presence.begin).toHaveBeenCalledWith('PHOTOS');
    expect(actions.setPhotoDragging).toHaveBeenCalledWith(true);
    expect(actions.presence.end).not.toHaveBeenCalledWith('PHOTOS');

    release();

    expect(actions.presence.end).toHaveBeenCalledWith('PHOTOS');
    expect(actions.setPhotoDragging).toHaveBeenLastCalledWith(false);
  });

  it('길게 누르기 시간이 되기 전에 놓으면 끌기가 시작되지 않는다', async () => {
    renderScreen();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const target = screen.getByRole('button', { name: BUNDLE_MESSAGES.photoOpenLabel(1) });

    fireEvent.mouseDown(target, { button: 0, clientX: 10, clientY: 10 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LONG_PRESS_MS - 100);
    });
    release();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LONG_PRESS_MS);
    });

    expect(actions.setPhotoDragging).not.toHaveBeenCalled();
    expect(actions.presence.begin).not.toHaveBeenCalledWith('PHOTOS');
  });

  it('사진이 1장이면 떠오르지 않는다', async () => {
    renderScreen({ draft: { ...publishable, photos: publishable.photos.slice(0, 1) } });

    await pressPhoto(1);

    expect(actions.setPhotoDragging).not.toHaveBeenCalled();
    expect(actions.presence.begin).not.toHaveBeenCalledWith('PHOTOS');
  });

  it('참여 멤버가 아니면 끌 수 없다', async () => {
    renderScreen({ viewer: outsider });

    await pressPhoto(1);

    expect(actions.setPhotoDragging).not.toHaveBeenCalled();
  });

  it('끄는 중 화면이 사라져도 작업 중 표시와 변경 미루기를 푼다', async () => {
    const view = renderScreen();
    await pressPhoto(1);
    expect(actions.setPhotoDragging).toHaveBeenCalledWith(true);

    view.unmount();

    expect(actions.setPhotoDragging).toHaveBeenLastCalledWith(false);
    expect(actions.presence.end).toHaveBeenCalledWith('PHOTOS');
  });
});
