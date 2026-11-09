import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftActions } from '../../hooks/useDraft';
import type { DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { bunchMembersFixture, draftFixture } from '../../fixtures/draft.fixture';
import { DraftMemberManager } from './DraftMemberManager';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const onBack = vi.fn();
const onLeave = vi.fn();

// 상태를 직접 들고 있어 추가·내보내기로 카드가 목록 사이를 옮겨가는 것까지 확인
function Harness({ viewer }: { viewer: DraftViewer }) {
  const [members, setMembers] = useState(draftFixture.members);
  const actions: Pick<DraftActions, 'addMember' | 'removeMember'> = {
    addMember: (id) => {
      const member = bunchMembersFixture.find((candidate) => candidate.id === id);
      if (member) setMembers((current) => [...current, member]);
    },
    removeMember: (id) => setMembers((current) => current.filter((member) => member.id !== id)),
  };
  return (
    <DraftMemberManager
      draft={{ ...draftFixture, members }}
      viewer={viewer}
      bunchMembers={bunchMembersFixture}
      actions={actions}
      onBack={onBack}
      onLeave={onLeave}
    />
  );
}

const owner: DraftViewer = { memberId: 'jiye', bunchRole: 'owner' };
const normal: DraftViewer = { memberId: 'eunwoo', bunchRole: 'member' };
const outsider: DraftViewer = { memberId: 'hyochan', bunchRole: 'member' };

const joined = () => screen.getByRole('region', { name: '참여 멤버' });
const addable = () => screen.getByRole('region', { name: '멤버 추가하기' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('참여 멤버 관리 화면', () => {
  it('참여하지 않은 번치 멤버는 위에, 참여 멤버는 아래에 나열한다', () => {
    render(<Harness viewer={owner} />);

    expect(within(addable()).getAllByRole('listitem')).toHaveLength(4);
    expect(within(addable()).getByText('효찬')).toBeInTheDocument();
    expect(within(joined()).getAllByRole('listitem')).toHaveLength(4);
  });

  it('내 카드에는 「(나)」가 붙고 역할 배지는 하나만 읽힌다', () => {
    render(<Harness viewer={owner} />);

    expect(within(joined()).getByText('(나)')).toBeInTheDocument();
    // 지예는 번치장이면서 초안 생성자이지만 번치장 배지만 보임
    expect(within(joined()).getAllByRole('img', { name: '번치장' })).toHaveLength(1);
    expect(within(joined()).queryByRole('img', { name: '초안 작성자' })).not.toBeInTheDocument();
  });

  it('뒤로가기는 onBack을 부른다', async () => {
    render(<Harness viewer={owner} />);

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('멤버 추가', () => {
  it('「추가하기」는 확인 없이 바로 참여 멤버 맨 아래로 옮기고 토스트로 알린다', async () => {
    render(<Harness viewer={owner} />);

    await userEvent.click(screen.getByRole('button', { name: '효찬 추가하기' }));

    expect(within(addable()).queryByText('효찬')).not.toBeInTheDocument();
    const rows = within(joined()).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(within(rows[4]!).getByText('효찬')).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith('효찬님이 번들 참여 멤버에 추가되었어요.', {
      fullWidth: true,
    });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('삭제 버튼이 없는 카드로 옮겨가면 카드 자체로 포커스가 이동한다', async () => {
    render(<Harness viewer={normal} />);

    await userEvent.click(screen.getByRole('button', { name: '효찬 추가하기' }));

    await waitFor(() => {
      const rows = within(joined()).getAllByRole('listitem');
      expect(rows[rows.length - 1]).toHaveFocus();
    });
  });

  it('추가할 멤버가 없으면 「멤버 추가하기」 영역을 숨긴다', async () => {
    render(<Harness viewer={owner} />);

    for (const name of ['효찬', '경준', '재현', '서현']) {
      await userEvent.click(screen.getByRole('button', { name: `${name} 추가하기` }));
    }

    expect(screen.queryByRole('region', { name: '멤버 추가하기' })).not.toBeInTheDocument();
  });

  it('참여 멤버가 아니면 「멤버 추가하기」 영역 자체가 없다', () => {
    render(<Harness viewer={outsider} />);

    expect(screen.queryByRole('region', { name: '멤버 추가하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /추가하기$/ })).not.toBeInTheDocument();
  });

  it('추가하면 포커스가 옮겨간 카드의 X 버튼으로 이동한다', async () => {
    render(<Harness viewer={owner} />);

    await userEvent.click(screen.getByRole('button', { name: '효찬 추가하기' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '효찬 내보내기' })).toHaveFocus(),
    );
  });
});

describe('삭제 버튼(X) 노출', () => {
  it('초안 생성자는 다른 멤버와 내 카드에 X가 있다', () => {
    render(<Harness viewer={owner} />);

    expect(within(joined()).getAllByRole('button')).toHaveLength(4);
    expect(within(joined()).getByRole('button', { name: '번들에서 나가기' })).toBeInTheDocument();
    expect(within(joined()).getByRole('button', { name: '경진 내보내기' })).toBeInTheDocument();
  });

  it('일반 멤버는 내 카드에만 X가 있다', () => {
    render(<Harness viewer={normal} />);

    const buttons = within(joined()).getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('번들에서 나가기');
  });

  it('초안 생성자 카드에는 다른 사람이 볼 때 X가 없다', () => {
    render(<Harness viewer={{ memberId: 'gyeongjin', bunchRole: 'coOwner' }} />);

    expect(within(joined()).queryByRole('button', { name: '지예 내보내기' })).toBeNull();
    // 참여 중인 공동 관리자의 일반 멤버 내보내기 권한
    expect(within(joined()).getByRole('button', { name: '은우 내보내기' })).toBeInTheDocument();
  });

  it('참여 멤버가 아니면 어느 카드에도 X가 없다', () => {
    render(<Harness viewer={outsider} />);

    expect(within(joined()).queryAllByRole('button')).toHaveLength(0);
  });
});

describe('내보내기', () => {
  it('확인 창에서 「내보내기」를 누르면 멤버가 위 목록으로 옮겨가고 토스트가 뜬다', async () => {
    render(<Harness viewer={owner} />);

    await userEvent.click(screen.getByRole('button', { name: '은우 내보내기' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('은우님을 번들에서 내보낼까요?')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '내보내기' }));

    expect(within(joined()).queryByText('은우')).not.toBeInTheDocument();
    expect(within(addable()).getByText('은우')).toBeInTheDocument();
    // 확인 창이 닫힌 뒤에 알림
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('은우님이 번들 참여 멤버에서 제외되었어요.', {
        fullWidth: true,
      }),
    );
    // 포커스는 「멤버 추가하기」로 옮겨간 카드의 「추가하기」로 이동
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '은우 추가하기' })).toHaveFocus(),
    );
  });

  it('내용은 「삭제되며,」 뒤에서 줄이 바뀐다', async () => {
    render(<Harness viewer={owner} />);

    await userEvent.click(screen.getByRole('button', { name: '은우 내보내기' }));
    const dialog = await screen.findByRole('alertdialog');

    expect(within(dialog).getByText(/남긴 코멘트가 삭제되며,/).textContent).toBe(
      '은우님이 남긴 코멘트가 삭제되며,\n복구할 수 없어요.',
    );
  });

  it('「취소」를 누르면 창만 닫히고 목록은 그대로다', async () => {
    render(<Harness viewer={owner} />);

    await userEvent.click(screen.getByRole('button', { name: '은우 내보내기' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(within(joined()).getByText('은우')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('스스로 나가기', () => {
  it('일반 멤버는 「번들에서 나가시겠어요?」 확인 뒤 나간다', async () => {
    render(<Harness viewer={normal} />);

    await userEvent.click(screen.getByRole('button', { name: '번들에서 나가기' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(BUNDLE_MESSAGES.leaveConfirmTitle)).toBeInTheDocument();
    expect(onLeave).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('일반 멤버 모달의 내용은 「삭제되며,」 뒤에서 줄이 바뀐다', async () => {
    render(<Harness viewer={normal} />);

    await userEvent.click(screen.getByRole('button', { name: '번들에서 나가기' }));
    const dialog = await screen.findByRole('alertdialog');

    expect(within(dialog).getByText(/작성한 코멘트가 삭제되며,/).textContent).toBe(
      '번들에서 나가면 작성한 코멘트가 삭제되며,\n복구할 수 없어요.',
    );
  });

  it('초안 생성자는 번들이 삭제된다는 문구의 모달을 본다', async () => {
    render(<Harness viewer={owner} />);

    await userEvent.click(screen.getByRole('button', { name: '번들에서 나가기' }));
    const dialog = await screen.findByRole('alertdialog');

    expect(within(dialog).getByText(BUNDLE_MESSAGES.leaveCreatorTitle)).toBeInTheDocument();
  });

  it('「취소」를 누르면 나가지 않고 화면에 남는다', async () => {
    render(<Harness viewer={normal} />);

    await userEvent.click(screen.getByRole('button', { name: '번들에서 나가기' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '취소' }),
    );

    expect(onLeave).not.toHaveBeenCalled();
  });
});
