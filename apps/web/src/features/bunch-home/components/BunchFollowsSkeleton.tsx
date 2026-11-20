import { cn, Skeleton } from '@app/design-system';
import { ProfileListSkeleton } from '@/shared/components/skeleton/ProfileRowSkeleton';

type BunchFollowsSkeletonProps = {
  /** 처음 고른 탭(주소의 `?tab=following`이면 팔로잉) */
  selected?: 'followers' | 'following' | undefined;
};

/**
 * 팔로워·팔로잉 화면 본문의 받는 중 자리(BunchFollowsScreen과 같은 배치, Figma에 없는 상태)
 * 탭 이름은 고정 문구라 실제로 쓰고 개수만 회색, 아래는 사진·이름·오른쪽 버튼 행
 */
export function BunchFollowsSkeleton({ selected = 'followers' }: BunchFollowsSkeletonProps) {
  const tabs = [
    { id: 'followers', label: '팔로워' },
    { id: 'following', label: '팔로잉' },
  ] as const;
  return (
    <div aria-hidden="true" className="px-padding-p8">
      {/* MenuTabs(text): 높이 40, 선택 탭은 진한 글자·아래 2px 선 */}
      <div className="flex">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            className={cn(
              'typography-body-1-medium gap-s4 flex h-10 flex-1 items-center justify-center border-b-2',
              tab.id === selected
                ? 'text-text-primary border-chip-gray-fg'
                : 'text-text-tertiary border-transparent',
            )}
          >
            {tab.label}
            <Skeleton className="h-4 w-3" />
          </span>
        ))}
      </div>
      <ProfileListSkeleton variant="plain" trailing={1} count={5} className="pt-s6" />
    </div>
  );
}
