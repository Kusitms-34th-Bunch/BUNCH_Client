import { Skeleton } from '@app/design-system';

// 한마디 칩 폭(사진·두세 글자 이름 칩 대표값). 실제 칩 높이 36px
const CHIP_WIDTHS = ['w-16', 'w-16', 'w-20'];

/**
 * 번들 상세에서 사진 아래(한마디 칩·한마디·좋아요/댓글 줄)의 받는 중 자리
 * 피드 카드 데이터로 위쪽(번치·제목·첫 사진)을 먼저 그릴 때 그 아래에 이것만 두는 부분 스켈레톤으로도 씀
 */
export function BundleDetailRestSkeleton() {
  return (
    <div aria-hidden="true">
      {/* MemberComments: 위 24, 칩과 한마디 사이 16 */}
      <div className="gap-s4 flex flex-col pt-6">
        <div className="gap-s4 px-padding-p8 flex overflow-hidden">
          {CHIP_WIDTHS.map((width, index) => (
            <Skeleton key={index} shape="round" className={`h-9 ${width}`} />
          ))}
        </div>
        <div className="bg-surface-secondary rounded-r5 mx-padding-p8 p-padding-p8">
          <span className="typography-body-3-regular flex h-lh items-center">
            <Skeleton tone="strong" className="h-4 w-40" />
          </span>
        </div>
      </div>
      {/* BundleEngagement(상세): 위 24, 아래 16 */}
      <div className="pb-padding-p8 px-padding-p8 gap-s7 flex items-center pt-6">
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-6 w-10" />
      </div>
    </div>
  );
}

/**
 * 번들 상세 본문 전체의 받는 중 자리(알림·공유 링크처럼 가진 데이터 없이 들어왔을 때)
 * BundleDetailScreen과 같은 순서·여백: 번치·참여자 줄, 제목·날짜, 사진(4:5, 모서리 r10), 그 아래 부분
 * 헤더(뒤로 가기)는 고정 모양이라 화면 쪽이 실제 헤더를 그대로 둠
 */
export function BundleDetailSkeleton() {
  return (
    <div aria-hidden="true">
      {/* BundleAuthorInfo: 번치 사진(XS 34px)·이름·게시 시각, 오른쪽 참여자 얼굴(24px, 겹침 4px) */}
      <div className="px-padding-p8 py-s4 gap-s4 flex items-center">
        <Skeleton shape="round" className="size-8.5" />
        <div className="gap-s2 flex min-w-0 flex-1 flex-col">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
        <span className="flex items-center">
          <Skeleton shape="round" tone="strong" className="-mr-1 size-6" />
          <Skeleton shape="round" tone="strong" className="-mr-1 size-6" />
          <Skeleton shape="round" tone="strong" className="size-6" />
        </span>
      </div>
      {/* BundleInfo: 제목(heading-1)과 날짜 줄(body-3), 사이 20 */}
      <div className="pt-padding-p8 pb-padding-p5 px-padding-p8 gap-s5 flex flex-col">
        <span className="typography-heading-1-semibold flex h-lh items-center">
          <Skeleton className="h-6 w-40" />
        </span>
        <span className="typography-body-3-regular flex h-lh items-center">
          <Skeleton className="h-4 w-32" />
        </span>
      </div>
      {/* BundlePhoto(상세): 좌우 16, 4:5 */}
      <div className="px-padding-p8">
        <Skeleton className="rounded-r10 aspect-4/5 w-full" />
      </div>
      <BundleDetailRestSkeleton />
    </div>
  );
}

/** 번들 상세의 댓글 목록 자리(들어오는 전환이 끝나기 전, #573). 댓글 한 줄: 프로필 사진·이름·본문 */
export function BundleCommentsSkeleton() {
  return (
    <div aria-hidden="true" className="px-padding-p8 pt-padding-p8 gap-s7 flex flex-col">
      {['w-32', 'w-48', 'w-40'].map((width, index) => (
        <div key={index} className="gap-s4 flex">
          <Skeleton shape="round" className="size-8 shrink-0" />
          <div className="gap-s2 flex min-w-0 flex-1 flex-col pt-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton tone="strong" className={`h-4 ${width}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
