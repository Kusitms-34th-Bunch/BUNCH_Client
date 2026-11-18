import { BundleCommentCard, BundleTitle } from '@app/design-system/web';
import { useId } from 'react';
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
  /**
   * 모든 카드를 흐리게 잠근 보기 전용(발행 번들 수정): 누르면 포커스 없이 `onDenied`만 부르고 입력할 수 없음
   * 내 카드도 잠기고 맨 위로 올리지 않음
   */
  locked?: boolean | undefined;
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
  locked = false,
}: DraftCommentsProps) {
  const lockedNoticeId = useId();
  // 제목 옆 프로필은 지금 코멘트를 쓰는 멤버만(Figma: 쓰는 사람이 없으면 아무도 보이지 않음)
  const writers = draft.members.filter(
    (member) =>
      (draft.editing.commentMemberIds ?? []).includes(member.id) ||
      (selfWriting && member.id === viewer.memberId),
  );
  const members = locked
    ? draft.members
    : [...draft.members].sort(
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
      {/* 흐림만으로는 잠긴 사유가 전해지지 않아, 잠긴 카드의 입력창 설명으로 이어 읽히는 안내를 한 번만 둠 */}
      {locked ? (
        <p id={lockedNoticeId} className="sr-only">
          {BUNDLE_MESSAGES.commentLocked}
        </p>
      ) : null}
      <ul className="gap-s3 flex flex-col">
        {members.map((member) => {
          const mine = member.id === viewer.memberId;
          const saved =
            draft.comments.find((comment) => comment.memberId === member.id)?.text ?? '';
          // 다른 멤버가 쓰는 글자는 저장 전이어도 그 카드에 바로 보임(기능 spec 4.3.8, 입력 미리보기). 내 카드는 내가 친 값 그대로
          const text = (!mine ? draft.editing.commentTexts?.[member.id] : undefined) ?? saved;
          return (
            <li
              key={member.id}
              // 잠긴 카드는 흐리게 두고(Figma disabled 불투명도) 누르면 안내만 함
              className={locked ? 'opacity-(--semantic-opacity-disabled)' : undefined}
            >
              <BundleCommentCard
                userName={member.name}
                currentUser={mine}
                profileSrc={member.avatarSrc}
                value={text}
                maxLength={COMMENT_MAX_LENGTH}
                readOnly={locked || !(mine && editable)}
                describedBy={locked ? lockedNoticeId : undefined}
                error={
                  locked
                    ? undefined
                    : // 금칙어는 400자 안내와 같은 자리(카드 아래)에 보이고 다른 멤버 화면에도 보임(기능명세 4.3.8 상세 5)
                      draft.prohibited?.commentMemberIds.includes(member.id)
                      ? BUNDLE_MESSAGES.prohibitedWord
                      : text.length >= COMMENT_MAX_LENGTH
                        ? BUNDLE_MESSAGES.commentMax
                        : undefined
                }
                // 남의 카드는 터치·클릭해도 포커스(테두리 강조)가 생기지 않고 Tab 순서에서도 제외
                tabIndex={mine && !locked ? undefined : -1}
                onMouseDown={
                  mine && !locked
                    ? undefined
                    : (event) => {
                        event.preventDefault();
                        if (locked || !editable) onDenied();
                      }
                }
                onFocus={
                  locked ? undefined : editable ? (mine ? onWriteStart : undefined) : onDenied
                }
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
