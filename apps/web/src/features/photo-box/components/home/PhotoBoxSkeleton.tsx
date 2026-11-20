import { Header, LineChevronDownIcon, Skeleton, TextButton } from '@app/design-system';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PhotoGridSkeleton } from '@/shared/components/skeleton/PhotoGridSkeleton';

// 멤버 칩 폭(「전체」 48px + 사진·두 글자 이름 칩 약 70px). 실제 칩 L(높이 40px)과 같은 높이
const CHIP_WIDTHS = ['w-12', 'w-18', 'w-17', 'w-18.5', 'w-17.5'];

/**
 * 첫 목록을 불러오는 동안의 자리표시(Figma에 없는 상태)
 * 서버에서 오는 부분(번치 이름·멤버 칩·날짜·사진)만 회색으로, 고정 부분(전환 화살표·「선택」)은 실제 모양으로 그림
 * 헤더도 같은 높이로 그려 다 받은 뒤 내용이 밀리지 않게 하고, 사진 칸은 화면 끝까지 채움
 */
export function PhotoBoxSkeleton() {
  return (
    <PageShell
      header={
        // 받기 전이라 누를 수 없음(inert), 보이는 모양만 실제 헤더와 같음
        <div aria-hidden="true" inert>
          <Header
            leading={
              // AccountSwitcher와 같은 여백·글줄 높이(이름 18/27 + 화살표)
              <span className="p-s3 gap-s1 inline-flex items-center">
                <span className="typography-heading-2-semibold flex h-lh items-center">
                  <Skeleton className="h-5 w-24" />
                </span>
                <LineChevronDownIcon size="lg" className="text-icon-tertiary shrink-0" />
              </span>
            }
            trailing={<TextButton size="sm">선택</TextButton>}
          />
        </div>
      }
    >
      <h1 className="sr-only">사진함</h1>
      {/* 사진이 하단 탭 바 뒤까지 이어지는 실제 목록처럼, 본문 아래 여백(탭 바 자리)까지 채우고 넘치는 칸은 자름 */}
      <div
        role="status"
        className="-mb-(--main-tab-bar-scroll-inset,0px) h-[calc(100%+var(--main-tab-bar-scroll-inset,0px))] overflow-hidden"
      >
        <span className="sr-only">사진함을 불러오는 중이에요</span>
        <div aria-hidden="true">
          {/* MemberFilter와 같은 여백(위 36, 좌우 32, 칩 사이 12, 아래 4) */}
          <div className="gap-s3 px-s8 pt-s9 flex overflow-hidden pb-1">
            {CHIP_WIDTHS.map((width) => (
              <Skeleton key={width} shape="round" className={`h-10 ${width}`} />
            ))}
          </div>
          {/* PhotoDateSection 제목과 같은 여백·글줄 높이 */}
          <div className="pt-s8 pr-s7 pb-s3 pl-s8">
            <span className="typography-body-3-semibold flex h-lh items-center">
              <Skeleton className="h-4 w-20" />
            </span>
          </div>
          <PhotoGridSkeleton count={30} />
        </div>
      </div>
    </PageShell>
  );
}
