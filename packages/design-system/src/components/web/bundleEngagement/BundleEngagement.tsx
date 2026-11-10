import type { ComponentProps } from 'react';
import { LineMessageCircleLargeIcon } from '../../../icons';
import { cn } from '../../../utils';
import { BundleParticipants, type BundleParticipant } from '../bundleParticipants';
import { LikeButton } from '../likeButton';

export type BundleEngagementProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 현재 번치가 좋아요한 상태 */
  liked: boolean;
  /** 좋아요 수 */
  likeCount: number;
  /** 하트를 눌렀을 때(상태 전환은 호출자 담당) */
  onLike: () => void;
  /** 댓글 수 */
  commentCount: number;
  /** 말풍선을 눌렀을 때. 없으면 댓글 수는 글자로만 보임 */
  onComment?: (() => void) | undefined;
  /** 참여 멤버. 있으면 오른쪽에 얼굴 묶음 */
  members?: BundleParticipant[] | undefined;
  /** 참여 멤버 묶음을 눌렀을 때 */
  onMembers?: (() => void) | undefined;
};

/**
 * 번들 반응 줄(Figma `Bundle Engagement`): 좋아요·댓글 수와 오른쪽 참여 멤버
 * 바깥 여백(위 14·아래 8·좌우 16)까지 포함하며 배경은 흰색
 */
export const BundleEngagement = ({
  liked,
  likeCount,
  onLike,
  commentCount,
  onComment,
  members,
  onMembers,
  className,
  ...props
}: BundleEngagementProps) => (
  <div
    className={cn(
      'bg-surface-primary gap-s7 pt-padding-p7 pb-padding-p4 px-padding-p8 flex items-center',
      className,
    )}
    {...props}
  >
    <div className="gap-s7 flex min-w-0 flex-1 items-center">
      <LikeButton liked={liked} count={likeCount} onClick={onLike} />
      {onComment ? (
        <button
          type="button"
          onClick={onComment}
          className="gap-s1 typography-body-3-regular text-text-tertiary focus-visible:outline-border-brand rounded-r2 relative inline-flex shrink-0 cursor-pointer touch-manipulation items-center before:absolute before:-inset-x-1 before:-inset-y-2.5 focus-visible:outline-2"
        >
          <span className="sr-only">댓글</span>
          <LineMessageCircleLargeIcon aria-hidden className="text-icon-secondary" />
          <span>{commentCount}</span>
        </button>
      ) : (
        <span className="gap-s1 typography-body-3-regular text-text-tertiary inline-flex items-center">
          <span className="sr-only">댓글</span>
          <LineMessageCircleLargeIcon aria-hidden className="text-icon-secondary" />
          <span>{commentCount}</span>
        </span>
      )}
    </div>
    {members ? <BundleParticipants members={members} onClick={onMembers} /> : null}
  </div>
);
