import type { ComponentProps } from 'react';
import {
  LineCornerDownRightSmallIcon,
  LineDotsSmallIcon,
  LineMessageCircleSmallIcon,
} from '../../../icons';
import { cn } from '../../../utils';
import { ColorBadge, type ColorBadgeColor } from '../colorBadge';
import { ProfileImage } from '../profileImage';

export type CommentItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 작성자 닉네임 */
  author: string;
  /** 프로필 이미지 주소. 삭제된 댓글의 회색 기본 이미지도 호출자가 넘김 */
  avatarSrc?: string | undefined;
  /** 작성자 번치 이름(배지) */
  bunchName?: string | undefined;
  /** 배지 색(번치 성격에 맞춰 호출자가 정함). 기본 brand */
  bunchColor?: ColorBadgeColor | undefined;
  /** 작성 날짜 글자(예: 「2025.06.08」) */
  date?: string | undefined;
  /** 본문. 줄바꿈 유지 */
  content?: string | undefined;
  /** 답글이면 들여쓰기와 꺾인 화살표 */
  reply?: boolean | undefined;
  /** 삭제된 댓글·답글: 「작성자」·「삭제된 댓글입니다」만 보이고 배지·날짜·답글 버튼은 숨김 */
  deleted?: boolean | undefined;
  /** 답글 수. 0이면 「답글 달기」 */
  replyCount?: number | undefined;
  /** 답글 버튼. 원댓글(답글·삭제 아님)이고 이 값이 있을 때만 표시 */
  onReply?: (() => void) | undefined;
  /** 더보기 버튼. 있으면 오른쪽 위에 점 아이콘 */
  onMore?: (() => void) | undefined;
  /** 더보기 버튼 접근성 이름. 기본값 `<작성자> 댓글 더보기` */
  moreLabel?: string | undefined;
};

const DELETED_AUTHOR = '작성자';
const DELETED_CONTENT = '삭제된 댓글입니다';

/**
 * 댓글 목록의 한 줄(Figma `Comment Item`): 댓글·답글·삭제된 댓글·삭제된 답글 4가지 모양
 * 목록 의미(`ul`·`li`)와 간격, 날짜 형식, 배지 색은 호출자 담당
 */
export const CommentItem = ({
  author,
  avatarSrc,
  bunchName,
  bunchColor = 'brand',
  date,
  content,
  reply = false,
  deleted = false,
  replyCount = 0,
  onReply,
  onMore,
  moreLabel,
  className,
  ...props
}: CommentItemProps) => {
  const name = deleted ? DELETED_AUTHOR : author;

  return (
    <div
      {...props}
      className={cn(
        'bg-surface-primary gap-s4 flex items-start',
        // Figma: 원댓글 위아래 14, 답글은 위 8·아래 14
        reply ? 'pt-padding-p4 pb-padding-p7' : 'py-padding-p7',
        className,
      )}
    >
      {reply ? (
        <LineCornerDownRightSmallIcon aria-hidden className="text-icon-quaternary shrink-0" />
      ) : null}
      <ProfileImage
        src={avatarSrc}
        size="XS"
        className="outline-border-tertiary outline -outline-offset-1"
      />
      <div className={cn('flex min-w-0 flex-1 flex-col', deleted ? 'gap-s1' : 'gap-s5')}>
        {/* 들여쓰기·화살표가 보이지 않는 낭독에서 원댓글과 구분 */}
        {reply ? <span className="sr-only">답글</span> : null}
        <div className={cn('flex min-w-0 flex-col', deleted ? 'gap-s1' : 'gap-s3')}>
          <div className="flex items-start">
            <div className="gap-s1 flex min-w-0 flex-1 flex-col">
              <div className="gap-s3 flex min-w-0 items-center">
                <span
                  className={cn(
                    'typography-body-3-semi-bold truncate',
                    deleted ? 'text-text-quaternary' : 'text-text-secondary',
                  )}
                >
                  {name}
                </span>
                {!deleted && bunchName ? (
                  <ColorBadge
                    color={bunchColor}
                    size="md"
                    // Figma 배지 여백 좌우 6·위아래 2(ColorBadge 기본보다 작음)
                    className="px-padding-p3 py-padding-p1"
                  >
                    {bunchName}
                  </ColorBadge>
                ) : null}
              </div>
              {!deleted && date ? (
                <span className="typography-caption-1-regular text-text-quaternary">{date}</span>
              ) : null}
            </div>
            {onMore ? (
              // 아이콘 16px·누르는 영역 40px, 음수 margin으로 Figma 배치 유지
              <button
                type="button"
                aria-label={moreLabel ?? `${name} 댓글 더보기`}
                onClick={onMore}
                className="text-icon-quaternary -m-s6 p-s6 focus-visible:outline-border-brand relative inline-flex shrink-0 cursor-pointer touch-manipulation rounded-full focus-visible:outline-2"
              >
                <LineDotsSmallIcon aria-hidden />
              </button>
            ) : null}
          </div>
          {deleted ? (
            <p className="typography-body-4-regular text-text-quaternary">{DELETED_CONTENT}</p>
          ) : content ? (
            <p className="typography-body-3-regular text-text-secondary wrap-break-word whitespace-pre-line">
              {content}
            </p>
          ) : null}
        </div>
        {!reply && !deleted && onReply ? (
          <button
            type="button"
            onClick={onReply}
            // 보이는 글자를 포함하고 작성자로 구분(목록에서 같은 이름 반복 방지)
            aria-label={
              replyCount > 0
                ? `${name}님 댓글의 답글 ${replyCount}개`
                : `${name}님 댓글에 답글 달기`
            }
            className="gap-s2 typography-body-4-regular text-text-quaternary focus-visible:outline-border-brand rounded-r2 relative flex cursor-pointer touch-manipulation items-center self-start before:absolute before:-inset-x-1 before:-inset-y-2 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <LineMessageCircleSmallIcon aria-hidden className="text-icon-quaternary" />
            {replyCount > 0 ? `답글 ${replyCount}` : '답글 달기'}
          </button>
        ) : null}
      </div>
    </div>
  );
};
