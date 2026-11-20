import { LineHeartLargeIcon, LineMessageCircleLargeIcon, Skeleton } from '@app/design-system';

/**
 * 피드 카드 한 장의 받는 중 자리(FeedBundleCard와 같은 배치, Figma에 없는 상태)
 * 사진(4:5, 모서리 r10) 위의 번치·날짜·제목 자리와 아래 좋아요·댓글 줄. 아이콘은 고정 모양이라 실제로 그리고 숫자·참여자만 회색
 */
export function FeedCardSkeleton() {
  return (
    <div aria-hidden="true" className="gap-s5 flex w-full flex-col">
      <div className="rounded-r10 relative aspect-4/5 w-full overflow-hidden">
        <Skeleton shape="block" className="absolute inset-0 size-full" />
        {/* 번치 사진(XS 34px)·이름·게시 시각: BundlePhoto 위쪽과 같은 여백 */}
        <div className="pt-padding-p8 px-padding-p8 gap-s4 absolute inset-x-0 top-0 flex items-center">
          <Skeleton shape="round" tone="strong" className="size-8.5" />
          <div className="gap-s2 flex flex-col">
            <Skeleton tone="strong" className="h-4 w-20" />
            <Skeleton tone="strong" className="h-3 w-24" />
          </div>
        </div>
        {/* 제목·날짜: BundlePhoto 아래쪽 BundleInfo와 같은 여백 */}
        <div className="px-padding-p8 pb-padding-p8 gap-s4 absolute inset-x-0 bottom-0 flex flex-col">
          <Skeleton tone="strong" className="h-5 w-36" />
          <Skeleton tone="strong" className="h-4 w-28" />
        </div>
      </div>
      {/* BundleEngagement(카드 안이라 바깥 여백 없음): 좋아요·댓글 사이 28, 오른쪽 참여자 */}
      <div className="gap-s7 flex items-center">
        <div className="gap-s7 flex min-w-0 flex-1 items-center">
          <span className="gap-s1 text-icon-secondary inline-flex items-center">
            <LineHeartLargeIcon />
            <Skeleton className="h-4 w-3" />
          </span>
          <span className="gap-s1 text-icon-secondary inline-flex items-center">
            <LineMessageCircleLargeIcon />
            <Skeleton className="h-4 w-3" />
          </span>
        </div>
        <Skeleton shape="round" className="size-6" />
      </div>
    </div>
  );
}

type FeedListSkeletonProps = {
  /** 카드 수. 화면 높이를 넘는 만큼만(기본 2장) */
  count?: number | undefined;
};

/** 피드 목록의 받는 중 자리(목록과 같은 좌우 여백·카드 사이 56). 받는 중 안내는 FeedScreen의 상태 영역이 맡음 */
export function FeedListSkeleton({ count = 2 }: FeedListSkeletonProps) {
  return (
    <div aria-hidden="true" className="px-padding-p8 gap-s14 flex flex-col">
      {Array.from({ length: count }, (_, index) => (
        <FeedCardSkeleton key={index} />
      ))}
    </div>
  );
}
