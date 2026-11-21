import { cn, Skeleton, type SkeletonTone } from '@app/design-system';

type PhotoGridSkeletonProps = {
  /** 칸 수. 화면 끝까지 채울 만큼 주고, 넘치는 부분은 감싸는 쪽이 자름 */
  count: number;
  /** 칸 비율(기본 정사각형). 번치 홈 번들 칸은 `aspect-123/163` */
  cellClassName?: string | undefined;
  /** 실제 빈 칸과 같은 회색(사진함 빈 사진 칸은 strong) */
  tone?: SkeletonTone | undefined;
  className?: string | undefined;
};

/** 한 줄 3칸, 사이 1px 사진 격자의 받는 중 자리(사진함·번치 홈·다른 번치 격자와 같은 배치) */
export function PhotoGridSkeleton({
  count,
  cellClassName = 'aspect-square',
  tone = 'strong',
  className,
}: PhotoGridSkeletonProps) {
  return (
    <div aria-hidden="true" className={cn('grid grid-cols-3 gap-px', className)}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} shape="block" tone={tone} className={cn('w-full', cellClassName)} />
      ))}
    </div>
  );
}
