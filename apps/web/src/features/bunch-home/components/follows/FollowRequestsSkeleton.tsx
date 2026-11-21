import { Skeleton } from '@app/design-system';
import { ProfileListSkeleton } from '@/shared/components/skeleton/ProfileRowSkeleton';

/**
 * 팔로우 요청 본문의 받는 중 자리(FollowRequestsScreen과 같은 여백, Figma에 없는 상태)
 * 「대기 중인 요청 N개」 줄은 개수를 몰라 문구 자리만, 아래는 사진·이름·요청 시각과 승인·거절 버튼 행
 */
export function FollowRequestsSkeleton() {
  return (
    <div aria-hidden="true" className="pt-s6 px-padding-p8 pb-s8 gap-s6 flex flex-col">
      <div className="bg-surface-secondary rounded-r4 px-padding-p8 py-padding-p7">
        <span className="typography-label-s flex h-lh items-center">
          <Skeleton tone="strong" className="h-4 w-28" />
        </span>
      </div>
      <ProfileListSkeleton variant="plain" meta trailing={2} count={4} />
    </div>
  );
}
