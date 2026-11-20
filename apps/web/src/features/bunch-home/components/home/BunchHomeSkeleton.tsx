import {
  FillPhotoMediumIcon,
  Header,
  LineBellLargeIcon,
  LineChevronDownIcon,
  LineDotsLargeIcon,
  LinePencilMediumIcon,
  Skeleton,
} from '@app/design-system';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PhotoGridSkeleton } from '@/shared/components/skeleton/PhotoGridSkeleton';

/**
 * 번치 홈 헤더의 받는 중 자리: 번치 이름만 회색, 화살표·알림·더보기는 실제 모양(누를 수 없음)
 * 배경은 번치 성격 색을 아직 몰라 옅은 회색
 */
export function BunchHomeHeaderSkeleton() {
  return (
    <div aria-hidden="true" inert>
      <Header
        className="bg-surface-secondary"
        leading={
          // AccountSwitcher와 같은 여백·글줄 높이(이름 18/27 + 화살표)
          <span className="p-s3 gap-s1 inline-flex items-center">
            <span className="typography-heading-2-semibold flex h-lh items-center">
              <Skeleton tone="strong" className="h-5 w-24" />
            </span>
            <LineChevronDownIcon size="lg" className="text-icon-tertiary shrink-0" />
          </span>
        }
        trailing={
          // BunchHomeHeader와 같은 24px 아이콘, 사이 16
          <span className="gap-s8 text-icon-primary flex items-center">
            <LineBellLargeIcon />
            <LineDotsLargeIcon />
          </span>
        }
      />
    </div>
  );
}

/**
 * 번치 이름·설명·팔로워/팔로잉/멤버 수·「콕한 장소」 자리(BunchProfile과 같은 배치)
 * 다른 번치 화면은 「콕한 장소」가 없어 places를 끔
 */
export function BunchProfileSkeleton({ places = true }: { places?: boolean | undefined }) {
  return (
    <div aria-hidden="true" className="gap-s8 px-s8 flex flex-col">
      <div className="gap-s2 flex flex-col">
        <span className="typography-title-1-semi-bold flex h-lh items-center">
          <Skeleton className="h-7 w-32" />
        </span>
        <span className="typography-body-3-regular flex h-lh items-center">
          <Skeleton className="h-4 w-48" />
        </span>
      </div>
      {/* 수치 줄 높이 32, 수치 사이 16 */}
      <div className="gap-s4 flex min-h-8 items-center justify-between">
        <span className="gap-s6 flex items-center">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-12" />
        </span>
        {places ? <Skeleton className="rounded-r5 h-8 w-24" /> : null}
      </div>
    </div>
  );
}

type BundleTabsSkeletonProps = {
  /** 번들 칸 수(화면 끝까지 채울 만큼) */
  count?: number | undefined;
};

/**
 * 완성된 번들·작성 중 탭과 번들 칸의 받는 중 자리(BundleTabs와 같은 배치)
 * 탭 아이콘은 고정 모양이라 실제로 그리고(완성된 번들 탭 선택), 번들 칸(123:163)만 회색
 * 번치 홈 전체 스켈레톤 안에서 씀. 번들 목록만 받는 중인 부분 스켈레톤은 홈·번들 목록이 모두 저장 query라 아직 연결하지 않음(#473)
 */
export function BundleTabsSkeleton({ count = 9 }: BundleTabsSkeletonProps) {
  return (
    <div aria-hidden="true" className="flex flex-1 flex-col">
      <div className="flex">
        {/* MenuTabs.IconTab: 높이 40, 아래 1px 선, 선택 탭은 진한 선 */}
        <span className="text-icon-primary after:bg-icon-tertiary relative flex h-10 flex-1 items-center justify-center after:absolute after:inset-x-0 after:bottom-0 after:h-px">
          <FillPhotoMediumIcon />
        </span>
        <span className="text-icon-quaternary after:bg-border-tertiary relative flex h-10 flex-1 items-center justify-center after:absolute after:inset-x-0 after:bottom-0 after:h-px">
          <LinePencilMediumIcon />
        </span>
      </div>
      {/* CompletedBundleGrid와 같은 여백(좌우·위 4px)과 칸 비율 */}
      <PhotoGridSkeleton
        count={count}
        tone="default"
        cellClassName="aspect-123/163"
        className="px-s1 pt-s1"
      />
    </div>
  );
}

/**
 * 번치 홈 전체의 받는 중 자리(받은 것이 하나도 없을 때)
 * 프로필 이미지 영역·흰 시트·프로필·탭·번들 칸을 실제와 같은 높이로 그려, 다 받은 뒤 내용이 밀리지 않게 함
 */
export function BunchHomeSkeleton() {
  return (
    <PageShell
      className="to-surface-primary from-surface-secondary bg-linear-to-b from-50% to-50%"
      header={<BunchHomeHeaderSkeleton />}
    >
      {/* 받는 중 안내는 BunchHome의 늘 있는 상태 영역이 읽어 줌. 제목(번치 이름 h1)은 받은 뒤에만 두어 진입 초점이 한 번만 감 */}
      <div className="flex min-h-full flex-col">
        {/* BunchHomeScreen의 프로필 이미지 영역(높이 102)과 90px 이미지(위 24, 오른쪽 32) */}
        <div aria-hidden="true" className="bg-surface-secondary relative h-25.5 shrink-0">
          <Skeleton
            shape="round"
            tone="strong"
            className="border-border-tertiary right-s8 absolute top-6 z-10 size-22.5 border"
          />
        </div>
        <div className="bg-surface-primary rounded-t-r10 pt-padding-p16 gap-s8 relative -mt-5 flex flex-1 flex-col">
          <BunchProfileSkeleton />
          <BundleTabsSkeleton />
        </div>
      </div>
    </PageShell>
  );
}
