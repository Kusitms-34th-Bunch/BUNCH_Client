import { cn, Skeleton } from '@app/design-system';

export type ProfileRowSkeletonVariant = 'card' | 'plain';

type ProfileRowSkeletonProps = {
  /**
   * `card`: 테두리 있는 카드 행(ProfileListItem — 멤버 목록·차단 목록)
   * `plain`: 테두리 없는 행(FollowListItem — 팔로워·팔로잉·팔로우 요청)
   */
  variant?: ProfileRowSkeletonVariant | undefined;
  /** 오른쪽 버튼 자리 수(팔로우 버튼 1, 승인·거절 2) */
  trailing?: 0 | 1 | 2 | undefined;
  /** 이름 아래 보조 줄(요청 시각 등) */
  meta?: boolean | undefined;
  /** 이름 자리 폭(행마다 달리 줘 목록이 단조롭지 않게) */
  nameClassName?: string | undefined;
};

/** 프로필 사진(40px) + 이름 한 줄 목록 행의 받는 중 자리. 실제 행과 같은 여백·높이 */
export function ProfileRowSkeleton({
  variant = 'card',
  trailing = 0,
  meta = false,
  nameClassName = 'w-24',
}: ProfileRowSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'gap-s4 flex items-center justify-between',
        variant === 'card'
          ? 'border-border-tertiary rounded-r5 px-padding-p6 py-padding-p5 border'
          : 'p-padding-p4',
      )}
    >
      <div className="gap-s3 flex min-w-0 items-center">
        <Skeleton shape="round" className="size-10" />
        <span className="gap-s1 flex flex-col">
          <span
            className={cn(
              'flex h-lh items-center',
              variant === 'card' ? 'typography-body-1-medium' : 'typography-body-3-semibold',
            )}
          >
            <Skeleton className={cn('h-4', nameClassName)} />
          </span>
          {meta ? (
            <span className="typography-caption-1-regular flex h-lh items-center">
              <Skeleton className="h-3 w-12" />
            </span>
          ) : null}
        </span>
      </div>
      {trailing > 0 ? (
        <span className="gap-s4 flex shrink-0">
          {Array.from({ length: trailing }, (_, index) => (
            <Skeleton
              key={index}
              className={cn('rounded-r4 h-8', trailing === 1 ? 'w-14' : 'w-12')}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}

// 행마다 다른 이름 폭(실제 이름 길이처럼 보이게)
const NAME_WIDTHS = ['w-16', 'w-24', 'w-20', 'w-28', 'w-16', 'w-24'];

type ProfileListSkeletonProps = Omit<ProfileRowSkeletonProps, 'nameClassName'> & {
  /** 행 수(화면 높이를 넘지 않을 만큼, 기본 4) */
  count?: number | undefined;
  className?: string | undefined;
};

/** 프로필 목록의 받는 중 자리(카드 행은 사이 8, 테두리 없는 행은 붙여서). 받는 중 안내는 화면의 상태 영역이 맡음 */
export function ProfileListSkeleton({
  count = 4,
  variant = 'card',
  trailing,
  meta,
  className,
}: ProfileListSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex flex-col', variant === 'card' && 'gap-s4', className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <ProfileRowSkeleton
          key={index}
          variant={variant}
          trailing={trailing}
          meta={meta}
          nameClassName={NAME_WIDTHS[index % NAME_WIDTHS.length]}
        />
      ))}
    </div>
  );
}
