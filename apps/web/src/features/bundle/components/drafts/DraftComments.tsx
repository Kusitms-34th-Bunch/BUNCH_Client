import { BundleCommentCard, BundleTitle } from '@app/design-system/web';
import { EditingLottie } from '@/shared/components/loading/EditingLottie';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES, COMMENT_MAX_LENGTH } from '../../constants/messages';

type DraftCommentsProps = {
  draft: Draft;
  viewer: DraftViewer;
  /** 내 코멘트를 쓸 수 있는지(참여 멤버만) */
  editable: boolean;
  onChange: (_memberId: string, _text: string) => void;
  /** 고칠 수 없는 사람이 입력란에 닿았을 때 */
  onDenied: () => void;
};

/**
 * 참여 멤버별 코멘트 카드: 내 카드가 맨 위이고 내 카드만 입력할 수 있음(관리자도 남의 코멘트는 못 고침)
 * 다른 멤버가 쓰는 중이면 점 애니메이션만 보이고 잠그지는 않음
 */
export function DraftComments({ draft, viewer, editable, onChange, onDenied }: DraftCommentsProps) {
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
        members={draft.members.map((member) => ({ name: member.name, src: member.avatarSrc }))}
        membersLabel="참여 멤버"
      />
      <ul className="gap-s3 flex flex-col">
        {members.map((member) => {
          const mine = member.id === viewer.memberId;
          const text = draft.comments.find((comment) => comment.memberId === member.id)?.text ?? '';
          const writing = !mine && (draft.editing.commentMemberIds ?? []).includes(member.id);
          return (
            <li key={member.id}>
              <BundleCommentCard
                userName={member.name}
                currentUser={mine}
                profileSrc={member.avatarSrc}
                value={text}
                maxLength={COMMENT_MAX_LENGTH}
                readOnly={!(mine && editable)}
                editing={writing}
                editingContent={<EditingLottie />}
                editingLabel={
                  writing ? BUNDLE_MESSAGES.commentEditingLabel(member.name) : undefined
                }
                error={text.length >= COMMENT_MAX_LENGTH ? BUNDLE_MESSAGES.commentMax : undefined}
                onFocus={editable ? undefined : onDenied}
                onChange={(event) => onChange(member.id, event.target.value)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
