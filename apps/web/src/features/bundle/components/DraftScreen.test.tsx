import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftActions } from '../hooks/useDraft';
import type { Draft, DraftViewer } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { draftFixture } from '../fixtures/draft.fixture';
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
  setDate: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  searchPlaces: vi.fn(() => Promise.resolve([])),
} satisfies DraftActions;

const onBack = vi.fn();
const onLeave = vi.fn();
const onRetry = vi.fn();
const onPublish = vi.fn();

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
    onPublish={onPublish}
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
    expect(screen.getByText(draftFixture.photos[0]!.caption)).toBeInTheDocument();
    expect(screen.getByText('서울특별시 여의도동')).toBeInTheDocument();
    expect(screen.getByText('날짜 추가')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '공개' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '멤버 공개' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: '나가기' })).toBeInTheDocument();
  });

  it('저장 중이면 헤더가 「저장 중」으로 바뀐다', () => {
    renderScreen({ saveStatus: 'saving' });
    expect(within(screen.getByRole('banner')).getByRole('status')).toHaveTextContent('저장 중');
  });

  it('캡션이 없는 사진은 「캡션 추가...」를 보여 준다', () => {
    renderScreen({
      draft: {
        ...draftFixture,
        photos: [{ id: 'p', src: '/p.jpg', alt: '캡션 없는 사진', caption: '' }],
      },
    });
    expect(screen.getByText(BUNDLE_MESSAGES.captionPlaceholder)).toBeInTheDocument();
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

  it('참여 멤버가 아니면 「추가」 카드와 「나가기」가 없다', () => {
    renderScreen({ viewer: outsider });

    expect(membersSection().queryByRole('button', { name: '추가' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '나가기' })).not.toBeInTheDocument();
  });

  it('참여 멤버가 아닌 사람이 편집하려 하면 안내하고 값은 바뀌지 않는다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(screen.getByRole('textbox', { name: /제목/ }));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true });

    await userEvent.click(screen.getByRole('radio', { name: '멤버 공개' }));
    expect(actions.setVisibility).not.toHaveBeenCalled();
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
  it('권한과 필수 항목이 모두 맞으면 활성이고 확인 창에서 「업로드」를 눌러야 onPublish를 호출한다', async () => {
    renderScreen({ viewer: creator });

    expect(uploadButton()).not.toHaveAttribute('aria-disabled');
    await userEvent.click(uploadButton());
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('번들을 업로드할까요?')).toBeInTheDocument();
    expect(
      within(dialog).getByText('업로드한 번들은 멤버들과 공유되며, 업로드 이후 수정할 수 있어요.'),
    ).toBeInTheDocument();
    expect(onPublish).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '업로드' }));
    expect(onPublish).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(toast).not.toHaveBeenCalled();
  });

  it('확인 창이 열려 있는 사이 조건이 깨지면 확정해도 업로드하지 않고 안내한다', async () => {
    const { rerender } = renderScreen({ viewer: creator });

    await userEvent.click(uploadButton());
    const dialog = await screen.findByRole('alertdialog');
    // 확인 창을 연 채로 연결이 끊김
    rerender(screenElement({ viewer: creator, offline: true }));
    await userEvent.click(within(dialog).getByRole('button', { name: '업로드' }));

    expect(onPublish).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete, { fullWidth: true });
  });

  it('확인 창에서 「취소」를 누르면 업로드하지 않는다', async () => {
    renderScreen({ viewer: creator });

    await userEvent.click(uploadButton());
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(onPublish).not.toHaveBeenCalled();
  });

  it('권한이 없는 참여 멤버는 흐리게 보이고 누르면 이유를 안내한다', async () => {
    renderScreen({ viewer: plainMember });

    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadForbidden, { fullWidth: true });
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('참여 멤버가 아니면 「참여 멤버만 편집할 수 있어요」를 안내한다', async () => {
    renderScreen({ viewer: outsider });

    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true });
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('공개 범위를 고르지 않으면 비활성이고 누르면 입력을 안내한다', async () => {
    renderScreen({ draft: draftFixture });

    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete, { fullWidth: true });
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('필수 항목이 부족하면 비활성이고 누르면 입력을 안내한다', async () => {
    renderScreen({ draft: { ...draftFixture, title: '' } });

    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.uploadIncomplete, { fullWidth: true });
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('저장 중이거나 연결이 끊겨 있으면 업로드할 수 없다', async () => {
    const { unmount } = renderScreen({ saveStatus: 'saving' });
    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    unmount();

    renderScreen({ offline: true });
    expect(uploadButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(uploadButton());
    expect(onPublish).not.toHaveBeenCalled();
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

  it('공개 범위는 처음에는 아무것도 골라져 있지 않다', () => {
    renderScreen({ draft: draftFixture });

    expect(screen.getByRole('radio', { name: '공개' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '멤버 공개' })).not.toBeChecked();
  });

  it('공개 범위를 바꾸면 setVisibility를 호출한다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('radio', { name: '멤버 공개' }));
    expect(actions.setVisibility).toHaveBeenCalledWith('members');
  });

  it('다른 멤버가 코멘트를 쓰는 중이면 점 애니메이션만 보이고 잠그지는 않는다', () => {
    renderScreen({
      viewer: creator,
      draft: { ...draftFixture, editing: { commentMemberIds: ['gyeongjin'] } },
    });

    expect(screen.getByRole('img', { name: '경진님이 작성 중' })).toBeInTheDocument();
  });
});

describe('위치와 날짜', () => {
  it('위치를 지우면 removeLocation을 호출한다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '서울특별시 여의도동 지우기' }));
    expect(actions.removeLocation).toHaveBeenCalledWith('location-1');
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

describe('공개 범위 툴팁', () => {
  it('안내 아이콘을 누르면 툴팁이 열리고 다시 누르거나 Esc를 누르면 닫힌다', async () => {
    renderScreen();
    const help = screen.getByRole('button', { name: '공개 범위 설명' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await userEvent.click(help);
    expect(screen.getByRole('tooltip')).toHaveTextContent(BUNDLE_MESSAGES.visibilityTooltip);

    await userEvent.click(help);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await userEvent.click(help);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('닫혀 있어도 버튼의 설명으로 항상 연결돼 스크린 리더가 읽을 수 있다', () => {
    renderScreen();

    const help = screen.getByRole('button', { name: '공개 범위 설명' });
    expect(help).toHaveAccessibleDescription(BUNDLE_MESSAGES.visibilityTooltip);
  });

  it('포커스가 아이콘 밖으로 나가면 닫힌다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '공개 범위 설명' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('바깥을 누르면 닫힌다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '공개 범위 설명' }));
    await userEvent.click(screen.getByRole('radio', { name: '멤버 공개' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
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

  it('사진을 편집 중이면 캡션 자리에 편집 중 표시를 보이고 누르면 안내한다', async () => {
    renderScreen({ draft: { ...draftFixture, editing: { photoMemberIds: ['gyeongjin'] } } });

    expect(screen.queryByText(draftFixture.photos[0]!.caption)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '경진님이 편집 중' }));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, { fullWidth: true });
  });

  it('다른 멤버가 위치·날짜를 편집 중이면 그 멤버의 프로필만 보인다', () => {
    renderScreen({
      draft: { ...draftFixture, editing: { location: 'gyeongjin', date: 'eunwoo' } },
    });

    // 위치 「추가」 행에 프로필 이미지가 붙고, 위치·날짜 줄 모두 점 애니메이션은 없음
    expect(screen.getByRole('group', { name: '위치' })).toBeInTheDocument();
    const locationGroup = within(screen.getByRole('group', { name: '위치' }));
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
  it('일반 멤버는 확인 창에서 「나가기」를 눌러야 나간다', async () => {
    renderScreen({ viewer: { memberId: 'eunwoo', bunchRole: 'member' } });

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('번들에서 나가시겠어요?')).toBeInTheDocument();
    expect(onLeave).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('「취소」를 누르면 나가지 않고 현재 화면에 남는다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(onLeave).not.toHaveBeenCalled();
  });
});
