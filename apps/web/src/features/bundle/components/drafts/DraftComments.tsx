import { BundleCommentCard, BundleTitle } from '@app/design-system/web';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES, COMMENT_MAX_LENGTH } from '../../constants/messages';

type DraftCommentsProps = {
  draft: Draft;
  viewer: DraftViewer;
  /** 내 코멘트를 쓸 수 있는지(참여 멤버만) */
  editable: boolean;
  /** 내가 코멘트를 쓰는 중인지(제목 옆에 내 프로필) */
  selfWriting?: boolean | undefined;
  /** 내 코멘트 입력을 시작·끝냈을 때 */
  onWriteStart?: (() => void) | undefined;
  onWriteEnd?: (() => void) | undefined;
  onChange: (_memberId: string, _text: string) => void;
  /** 고칠 수 없는 사람이 입력란에 닿았을 때 */
  onDenied: () => void;
};

/**
 * 참여 멤버별 코멘트 카드: 내 카드가 맨 위이고 내 카드만 입력할 수 있음(관리자도 남의 코멘트는 못 고침)
 * 다른 멤버가 쓰는 글자는 저장 전이어도 그 카드에 바로 보이고(기능 spec 4.3.8) 잠그지는 않음
 */
export function DraftComments({
  draft,
  viewer,
  editable,
  selfWriting = false,
  onWriteStart,
  onWriteEnd,
  onChange,
  onDenied,
}: DraftCommentsProps) {
  // 제목 옆 프로필은 지금 코멘트를 쓰는 멤버만(Figma: 쓰는 사람이 없으면 아무도 보이지 않음)
  const writers = draft.members.filter(
    (member) =>
      (draft.editing.commentMemberIds ?? []).includes(member.id) ||
      (selfWriting && member.id === viewer.memberId),
  );
  const members = [...draft.members].sort(
    (a, b) => Number(b.id === viewer.memberId) - Number(a.id === viewer.memberId),
  );

  return (
    <section
      aria-labelledby="draft-comments-title"
      className="pt-s18 px-padding-p8 gap-s3 flex flex-col"
    >
      <BundleTitle
        title={BUNDLE_MESSAGES.commentsTitle}
        titleId="draft-comments-title"
        icon={false}
        required
        members={
          writers.length > 0
            ? writers.map((member) => ({ name: member.name, src: member.avatarSrc }))
            : undefined
        }
        membersLabel="코멘트를 쓰는 멤버"
      />
      <ul className="gap-s3 flex flex-col">
        {members.map((member) => {
          const mine = member.id === viewer.memberId;
          const saved =
            draft.comments.find((comment) => comment.memberId === member.id)?.text ?? '';
          // 다른 멤버가 쓰는 글자는 저장 전이어도 그 카드에 바로 보임(기능 spec 4.3.8, 입력 미리보기). 내 카드는 내가 친 값 그대로
          const text = (!mine ? draft.editing.commentTexts?.[member.id] : undefined) ?? saved;
          return (
            <li key={member.id}>
              <BundleCommentCard
                userName={member.name}
                currentUser={mine}
                profileSrc={member.avatarSrc}
                value={text}
                maxLength={COMMENT_MAX_LENGTH}
                readOnly={!(mine && editable)}
                error={text.length >= COMMENT_MAX_LENGTH ? BUNDLE_MESSAGES.commentMax : undefined}
                // 남의 카드는 터치·클릭해도 포커스(테두리 강조)가 생기지 않고 Tab 순서에서도 제외
                tabIndex={mine ? undefined : -1}
                onMouseDown={
                  mine
                    ? undefined
                    : (event) => {
                        event.preventDefault();
                        if (!editable) onDenied();
                      }
                }
                onFocus={editable ? (mine ? onWriteStart : undefined) : onDenied}
                onBlur={mine ? onWriteEnd : undefined}
                onChange={(event) => onChange(member.id, event.target.value)}
              />
            </li>
          );
        })}
      </ul>
      {/* 카드 목록과 8px(섹션 간격 6px + 2px) 떨어진 12px Medium 안내, 별표와 문구 사이 2px */}
      <p className="typography-caption-1-medium text-text-quaternary gap-s1 pt-s1 flex items-center">
        <span aria-hidden="true">*</span>
        {BUNDLE_MESSAGES.commentsNotice}
      </p>
    </section>
  );
}
