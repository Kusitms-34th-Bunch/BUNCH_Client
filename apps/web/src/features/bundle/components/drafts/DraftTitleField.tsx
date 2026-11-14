import { BundleTextInput } from '@app/design-system/web';
import { useLayoutEffect, useRef } from 'react';
import { EditingLottie } from '@/shared/components/loading/EditingLottie';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES, TITLE_MAX_LENGTH } from '../../constants/messages';
import { countTitleGraphemes } from '../../lib/title';
import { diffText } from '../../lib/titleCrdt';

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
  /** 한글 조합 같은 입력이 진행 중인지(진행 중에는 원격 변경을 화면에 반영하지 않음) */
  onComposing?: ((_composing: boolean) => void) | undefined;
  /** 제목 문서를 불러오는 중(입력을 받지 못하므로 읽기 전용으로 보임) */
  loading?: boolean | undefined;
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
  onComposing,
  loading = false,
  onDenied,
  onEditingBlocked,
}: DraftTitleFieldProps) {
  const editor = draft.members.find((member) => member.id === draft.editing.title);
  // 내가 입력 중이면 내 프로필(잠그지는 않음). 다른 멤버가 편집 중이면 그 멤버가 우선
  const me = draft.members.find((member) => member.id === viewer.memberId);
  const shown = editor ?? (selfEditing ? me : undefined);
  const tooLong = countTitleGraphemes(draft.title) > TITLE_MAX_LENGTH;

  // 다른 멤버의 변경이 합쳐져 값이 바뀌어도 내 커서·선택 영역이 글자를 따라가게 함(내가 친 변경은 브라우저가 맞춤)
  const sectionRef = useRef<HTMLElement>(null);
  const selection = useRef<{ start: number; end: number } | undefined>(undefined);
  const previous = useRef(draft.title);
  const typedByMe = useRef(false);
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = draft.title;
    if (typedByMe.current) {
      typedByMe.current = false;
      return;
    }
    const input = sectionRef.current?.querySelector('input');
    const range = selection.current;
    if (!input || !range || before === draft.title || document.activeElement !== input) return;
    const { index, remove, insert } = diffText(before, draft.title);
    const move = (position: number) =>
      position <= index
        ? position
        : position >= index + remove
          ? position - remove + insert.length
          : index + insert.length;
    const next = { start: move(range.start), end: move(range.end) };
    selection.current = next;
    input.setSelectionRange(next.start, next.end);
  }, [draft.title]);

  return (
    <section ref={sectionRef} className="pt-s15 px-padding-p8">
      <BundleTextInput
        title={BUNDLE_MESSAGES.titleLabel}
        icon={false}
        required
        members={shown ? [{ name: shown.name, src: shown.avatarSrc }] : undefined}
        membersLabel="편집 중인 멤버"
        value={draft.title}
        placeholder={BUNDLE_MESSAGES.titlePlaceholder}
        readOnly={!editable || editor !== undefined || loading}
        editing={editor !== undefined}
        editingContent={<EditingLottie />}
        // 낭독 영역은 항상 마운트해 두고 문구만 바꿔야 편집 시작이 상태 변화로 읽힘
        editingLabel={editor ? BUNDLE_MESSAGES.editingLabel(editor.name) : ''}
        errorMessage={
          tooLong
            ? BUNDLE_MESSAGES.titleTooLong
            : countTitleGraphemes(draft.title) >= TITLE_MAX_LENGTH
              ? BUNDLE_MESSAGES.titleMax
              : undefined
        }
        onFocus={
          !editable ? onDenied : editor ? onEditingBlocked : loading ? undefined : onEditStart
        }
        onBlur={() => {
          // 조합이 끝나지 않은 채 포커스를 잃어도 원격 변경이 계속 미뤄지지 않게 함
          onComposing?.(false);
          onEditEnd?.();
        }}
        onSelect={(event) => {
          selection.current = {
            start: event.currentTarget.selectionStart ?? 0,
            end: event.currentTarget.selectionEnd ?? 0,
          };
        }}
        onCompositionStart={() => onComposing?.(true)}
        onCompositionEnd={() => onComposing?.(false)}
        onChange={(event) => {
          // 40자(보이는 글자 기준)를 넘기는 입력은 받지 않음(원격 병합으로 넘은 값은 줄이는 방향만 허용)
          if (
            event.target.value.length > draft.title.length &&
            countTitleGraphemes(event.target.value) > TITLE_MAX_LENGTH
          ) {
            return;
          }
          typedByMe.current = true;
          selection.current = {
            start: event.target.selectionStart ?? 0,
            end: event.target.selectionEnd ?? 0,
          };
          onChange(event.target.value);
        }}
      />
    </section>
  );
}
