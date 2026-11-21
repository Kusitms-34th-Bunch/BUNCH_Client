import { LineChevronRightSmallIcon, Skeleton } from '@app/design-system';
import { ProfileListSkeleton } from '@/shared/components/skeleton/ProfileRowSkeleton';

/**
 * 멤버 관리 본문의 받는 중 자리(BunchMembersScreen과 같은 여백, Figma에 없는 상태)
 * 「멤버」·「역할별 권한보기」는 고정 문구라 실제로 쓰고(누를 수 없음) 인원수와 멤버 행만 회색
 */
export function BunchMembersSkeleton() {
  return (
    <div aria-hidden="true" className="pt-padding-p8 px-padding-p8 pb-s8 gap-s6 flex flex-col">
      <div className="typography-body-3-semibold flex items-center justify-between">
        <span className="text-text-secondary gap-s3 flex items-center">
          멤버
          <Skeleton className="h-4 w-8" />
        </span>
        <span className="text-text-tertiary gap-s1 flex items-center">
          역할별 권한보기
          <LineChevronRightSmallIcon />
        </span>
      </div>
      <ProfileListSkeleton variant="card" count={5} />
    </div>
  );
}
