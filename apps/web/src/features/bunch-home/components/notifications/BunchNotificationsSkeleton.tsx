import { Skeleton } from '@app/design-system';

// 카드마다 다른 제목·내용 폭(실제 알림 문구 길이처럼 보이게)
const ROWS = [
  { title: 'w-44', body: 'w-52' },
  { title: 'w-36', body: 'w-32' },
  { title: 'w-48', body: 'w-44' },
  { title: 'w-40', body: 'w-36' },
];

/**
 * 알림 목록의 받는 중 자리(NotificationCard와 같은 여백·높이, 카드 사이 8, Figma에 없는 상태)
 * 회색 바탕 화면 위 흰 카드라 카드 바탕은 실제처럼 흰색, 제목·시각·내용만 회색
 * 위쪽 알림 설정 안내 줄은 고정 문구라 화면이 실제로 그리고, 이것은 그 아래 목록 자리만 맡음
 */
export function BunchNotificationsSkeleton() {
  return (
    <div aria-hidden="true" className="gap-s4 flex flex-col">
      {ROWS.map((row, index) => (
        <div
          key={index}
          className="bg-surface-primary rounded-r5 px-padding-p8 py-padding-p7 gap-s2 flex flex-col"
        >
          <span className="gap-s4 flex items-center justify-between">
            <span className="typography-body-2-medium flex h-lh items-center">
              <Skeleton className={`h-4 ${row.title}`} />
            </span>
            <Skeleton className="h-3 w-10" />
          </span>
          <span className="typography-body-4-regular flex h-lh items-center">
            <Skeleton className={`h-3.5 ${row.body}`} />
          </span>
        </div>
      ))}
    </div>
  );
}
