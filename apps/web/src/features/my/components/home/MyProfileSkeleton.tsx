import { LineChevronRightLargeIcon, Skeleton } from '@app/design-system';

/**
 * MY 첫 화면 프로필 줄의 받는 중 자리(MyScreen 프로필 링크와 같은 여백·높이)
 * 프로필 사진(M 64px)과 닉네임만 회색, 오른쪽 화살표는 고정 모양이라 실제로 그림. 받기 전이라 누를 수 없음
 */
export function MyProfileSkeleton() {
  return (
    <div aria-hidden="true" className="px-padding-p8 py-padding-p5 gap-s5 flex items-center">
      <Skeleton shape="round" className="size-16" />
      <span className="typography-body-1-semi-bold flex h-lh min-w-0 flex-1 items-center">
        <Skeleton className="h-5 w-20" />
      </span>
      <LineChevronRightLargeIcon className="text-icon-quaternary shrink-0" />
    </div>
  );
}
