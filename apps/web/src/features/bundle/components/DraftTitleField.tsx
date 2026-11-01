import { BundleTextInput } from '@app/design-system/web';
import { EditingLottie } from '@/shared/components/loading/EditingLottie';
import type { Draft } from '../lib/types';
import { BUNDLE_MESSAGES, TITLE_MAX_LENGTH } from '../constants/messages';

type DraftTitleFieldProps = {
  draft: Draft;
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
  editable,
  onChange,
  onDenied,
  onEditingBlocked,
}: DraftTitleFieldProps) {
  const editor = draft.members.find((member) => member.id === draft.editing.title);

  return (
    <section className="pt-s15 px-padding-p8">
      <BundleTextInput
        title={BUNDLE_MESSAGES.titleLabel}
        icon={false}
        required
        members={editor ? [{ name: editor.name, src: editor.avatarSrc }] : undefined}
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
        onFocus={!editable ? onDenied : editor ? onEditingBlocked : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
