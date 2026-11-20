import { FillMapPinMediumIcon, LineDotsMediumIcon, Skeleton } from '@app/design-system';

// 멤버 칩 폭(「전체 N」 + 사진·이름·개수 칩)
const CHIP_WIDTHS = ['w-15', 'w-20', 'w-20', 'w-20', 'w-20'];

/** 콕한 장소 멤버 칩 줄의 받는 중 자리(PlaceMemberFilter와 같은 여백, 칩 높이 40) */
export function PlaceFilterSkeleton() {
  return (
    <div aria-hidden="true" className="gap-s3 px-s8 pt-s8 flex overflow-hidden pb-1">
      {CHIP_WIDTHS.map((width, index) => (
        <Skeleton key={index} shape="round" className={`h-10 ${width}`} />
      ))}
    </div>
  );
}

// 카드마다 다른 장소 이름·주소·출처 폭
const ROWS = [
  { name: 'w-24', address: 'w-28', source: 'w-36' },
  { name: 'w-32', address: 'w-24', source: 'w-40' },
  { name: 'w-28', address: 'w-20', source: 'w-32' },
  { name: 'w-20', address: 'w-28', source: 'w-36' },
  { name: 'w-28', address: 'w-24', source: 'w-40' },
];

/**
 * 콕한 장소 목록의 받는 중 자리(LocationCard와 같은 여백, 카드 사이 4, Figma에 없는 상태)
 * 핀·더보기 아이콘은 고정 모양이라 실제로 그리고(누를 수 없음) 장소 이름·주소·출처만 회색
 */
export function PlaceListSkeleton() {
  return (
    <div aria-hidden="true" className="gap-s2 px-padding-p8 pb-s8 flex flex-col pt-6">
      {ROWS.map((row, index) => (
        <div
          key={index}
          className="outline-border-tertiary rounded-r4 px-padding-p8 py-padding-p7 gap-s4 flex items-start outline -outline-offset-1"
        >
          <div className="gap-s5 flex min-w-0 flex-1 items-start">
            <span className="py-s1 flex shrink-0">
              <FillMapPinMediumIcon className="text-icon-quaternary" />
            </span>
            <span className="gap-s5 flex min-w-0 flex-1 flex-col">
              <span className="gap-s1 flex flex-col">
                <span className="typography-body-2-medium flex h-lh items-center">
                  <Skeleton className={`h-4 ${row.name}`} />
                </span>
                <span className="typography-body-4-regular flex h-lh items-center">
                  <Skeleton className={`h-3.5 ${row.address}`} />
                </span>
              </span>
              <span className="typography-caption-1-medium flex h-lh items-center">
                <Skeleton className={`h-3 ${row.source}`} />
              </span>
            </span>
          </div>
          <LineDotsMediumIcon className="text-icon-quaternary shrink-0" />
        </div>
      ))}
    </div>
  );
}
