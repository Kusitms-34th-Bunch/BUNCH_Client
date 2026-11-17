import { BundleTextInput } from '@app/design-system/web';
import { useLayoutEffect, useRef } from 'react';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES, TITLE_MAX_LENGTH } from '../../constants/messages';
import { diffHunks, mapPosition } from '../../lib/textDiff';
import { countTitleGraphemes } from '../../lib/title';

type DraftTitleFieldProps = {
  draft: Draft;
  /** 지금 보는 사람(내가 입력 중일 때 내 프로필을 보임) */
  viewer: DraftViewer;
  /** 내가 제목을 입력 중인지 */
  selfEditing?: boolean | undefined;
  /** 제목 입력을 시작·끝냈을 때(고칠 수 없으면 호출하지 않음) */
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
};

/** 번들 제목 입력: 40자까지, 제목을 입력 중인 멤버의 프로필을 「번들 제목」 옆에 모두 보임(잠그지 않음, 기능 spec 4.3.13) */
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
}: DraftTitleFieldProps) {
  // 제목을 입력 중인 멤버 모두(내가 입력 중이면 서버 표시가 오기 전에도 내 프로필을 보임)
  const typingIds = new Set(draft.editing.titleMemberIds ?? []);
  if (selfEditing) typingIds.add(viewer.memberId);
  const typists = draft.members
    .filter((member) => typingIds.has(member.id))
    .map((member) => ({ name: member.name, src: member.avatarSrc }));

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
    // 앞뒤에 동시에 끼어든 변경처럼 바뀐 구간이 여럿이어도 커서·선택 영역의 끝을 각각 같은 글자에 둠
    const hunks = diffHunks(before, draft.title);
    const next = { start: mapPosition(range.start, hunks), end: mapPosition(range.end, hunks) };
    selection.current = next;
    input.setSelectionRange(next.start, next.end);
  }, [draft.title]);

  return (
    <section ref={sectionRef} className="pt-s15 px-padding-p8">
      <BundleTextInput
        title={BUNDLE_MESSAGES.titleLabel}
        icon={false}
        required
        members={typists.length > 0 ? typists : undefined}
        membersLabel="편집 중인 멤버"
        value={draft.title}
        placeholder={BUNDLE_MESSAGES.titlePlaceholder}
        readOnly={!editable || loading}
        aria-busy={loading || undefined}
        // 고칠 수 없는 사람(참여 멤버가 아님·연결 끊김)은 포커스·커서 없이 닿았을 때 안내만 받음
        tabIndex={!editable ? -1 : undefined}
        onMouseDown={!editable ? (event) => event.preventDefault() : undefined}
        onClick={!editable ? onDenied : undefined}
        errorMessage={
          // 40자에 닿거나 합쳐진 결과가 넘으면 같은 오류(기능 spec 4.3.7)
          countTitleGraphemes(draft.title) >= TITLE_MAX_LENGTH
            ? BUNDLE_MESSAGES.titleMax
            : undefined
        }
        onFocus={
          !editable ? (event) => event.currentTarget.blur() : loading ? undefined : onEditStart
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
          // 늘어났는지도 UTF-16 길이가 아니라 보이는 글자(grapheme) 수로 비교(이모지를 일반 글자로 바꿔도 늘어난 것으로 봄)
          const nextGraphemes = countTitleGraphemes(event.target.value);
          if (
            nextGraphemes > TITLE_MAX_LENGTH &&
            nextGraphemes > countTitleGraphemes(draft.title)
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
