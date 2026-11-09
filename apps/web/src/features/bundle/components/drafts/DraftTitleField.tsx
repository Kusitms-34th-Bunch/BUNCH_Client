import { BundleTextInput } from '@app/design-system/web';
import { EditingLottie } from '@/shared/components/loading/EditingLottie';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES, TITLE_MAX_LENGTH } from '../../constants/messages';

type DraftTitleFieldProps = {
  draft: Draft;
  /** 지금 보는 사람(내가 입력 중일 때 내 프로필을 보임) */
  viewer: DraftViewer;
  /** 내가 제목을 입력 중인지 */
  selfEditing?: boolean | undefined;
  /** 제목 입력을 시작·끝냈을 때(다른 멤버가 편집 중이거나 고칠 수 없으면 호출하지 않음) */
  onEditStart?: (() => void) | undefined;
  onEditEnd?: (() => void) | undefined;
  /** 제목을 고칠 수 있는지(참여 멤버만) */
  editable: boolean;
  onChange: (_title: string) => void;
  /** 고칠 수 없는 사람이 입력란에 닿았을 때 */
  onDenied: () => void;
  /** 다른 멤버가 편집 중인 입력란에 닿았을 때 */
  onEditingBlocked: () => void;
};

/** 번들 제목 입력: 40자까지, 다른 멤버가 편집 중이면 그 멤버의 프로필과 「···」 표시 */
export function DraftTitleField({
  draft,
  viewer,
  selfEditing = false,
  onEditStart,
  onEditEnd,
  editable,
  onChange,
  onDenied,
  onEditingBlocked,
}: DraftTitleFieldProps) {
  const editor = draft.members.find((member) => member.id === draft.editing.title);
  // 내가 입력 중이면 내 프로필(잠그지는 않음). 다른 멤버가 편집 중이면 그 멤버가 우선
  const me = draft.members.find((member) => member.id === viewer.memberId);
  const shown = editor ?? (selfEditing ? me : undefined);

  return (
    <section className="pt-s15 px-padding-p8">
      <BundleTextInput
        title={BUNDLE_MESSAGES.titleLabel}
        icon={false}
        required
        members={shown ? [{ name: shown.name, src: shown.avatarSrc }] : undefined}
        membersLabel="편집 중인 멤버"
        value={draft.title}
        placeholder={BUNDLE_MESSAGES.titlePlaceholder}
        maxLength={TITLE_MAX_LENGTH}
        readOnly={!editable || editor !== undefined}
        editing={editor !== undefined}
        editingContent={<EditingLottie />}
        // 낭독 영역은 항상 마운트해 두고 문구만 바꿔야 편집 시작이 상태 변화로 읽힘
        editingLabel={editor ? BUNDLE_MESSAGES.editingLabel(editor.name) : ''}
        errorMessage={draft.title.length >= TITLE_MAX_LENGTH ? BUNDLE_MESSAGES.titleMax : undefined}
        onFocus={!editable ? onDenied : editor ? onEditingBlocked : onEditStart}
        onBlur={onEditEnd}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
