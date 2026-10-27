import type { ComponentProps } from 'react';
import {
  LineCalendarSmallIcon,
  LineChevronRightMediumIcon,
  LinePhotoSmallIcon,
} from '../../../icons';
import { cn } from '../../../utils';
import { ColorBadge } from '../colorBadge';

export type SuggestedBundleCardProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 번들 대표 사진 */
  imageSrc: string;
  /** 번들 이름 */
  title: string;
  /** 참여 멤버 이름(`maxVisibleMembers`개를 넘으면 마지막 칩이 "마지막 멤버 외 N명"으로 줄어듦) */
  members: string[];
  /** 번들에 포함된 사진 수 */
  photoCount: number;
  /** 촬영 날짜의 월(1~12) */
  month: number;
  /** 촬영 날짜의 일 */
  day: number;
  /** 선택된 카드(Figma `Selected`) */
  selected?: boolean | undefined;
  /** 마지막 요약 칩을 포함해 보여 줄 칩 수(기본 6개) */
  maxVisibleMembers?: number | undefined;
  /** 대표 사진의 대체 텍스트(기본은 번들 이름이 옆에 있어 장식으로 숨김) */
  imageAlt?: string | undefined;
  /** 카드를 눌렀을 때(선택 전환은 호출하는 쪽 담당) */
  onCardClick?: (() => void) | undefined;
  /** 오른쪽 화살표를 눌러 추천 번들 상세로 이동할 때 */
  onDetailClick?: (() => void) | undefined;
};

/**
 * 추천 번들 카드(Figma `SuggestedBundleCard`, 3Photos): 대표 사진·번들 이름·멤버 칩·사진 수·날짜
 * 카드 전체를 누르는 버튼과 오른쪽 상세 이동 버튼은 서로 다른 버튼이며 `className`은 카드에 적용
 */
export const SuggestedBundleCard = ({
  imageSrc,
  title,
  members,
  photoCount,
  month,
  day,
  selected = false,
  maxVisibleMembers = 6,
  imageAlt = '',
  onCardClick,
  onDetailClick,
  className,
  ...props
}: SuggestedBundleCardProps) => {
  const chipCount = Number.isFinite(maxVisibleMembers) ? Math.max(1, maxVisibleMembers) : 6;
  const hiddenCount = Math.max(0, members.length - chipCount);
  const chips = members.slice(0, chipCount);
  const lastChip = chips.at(-1);
  if (hiddenCount > 0 && lastChip !== undefined)
    chips[chips.length - 1] = `${lastChip} 외 ${hiddenCount}명`;
  const chipColor = selected ? 'brand' : 'gray';

  return (
    <div
      className={cn(
        'bg-surface-primary rounded-r8 p-s8 gap-s4 relative isolate flex w-full flex-col overflow-clip',
        // 눌림은 카드 위에 겹쳐 사진·칩·화살표까지 함께 어두워지게 처리
        'before:rounded-r8 before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:z-20 before:opacity-0',
        'has-[[data-card-button]:active]:before:opacity-100',
        'has-[[data-card-button]:focus-visible]:outline-border-brand has-[[data-card-button]:focus-visible]:outline-2 has-[[data-card-button]:focus-visible]:outline-offset-2',
        selected && 'ring-border-brand-subtle ring-1 ring-inset',
        className,
      )}
      {...props}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        decoding="async"
        className="rounded-r4 h-44.5 w-full object-cover"
      />
      <div className="gap-s4 flex w-full flex-col items-start">
        <div className="flex w-full items-center">
          <button
            type="button"
            data-card-button=""
            aria-pressed={selected}
            onClick={onCardClick}
            className={cn(
              'typography-body-1-semi-bold min-w-0 flex-1 cursor-pointer touch-manipulation text-left outline-none',
              // 버튼을 카드 전체로 넓혀 어디를 눌러도 카드가 눌리게 처리
              "after:absolute after:inset-0 after:content-['']",
              selected ? 'text-text-brand' : 'text-text-tertiary',
            )}
          >
            <span className="block truncate">{title}</span>
          </button>
          <button
            type="button"
            aria-label={`${title} 상세 보기`}
            onClick={onDetailClick}
            className={cn(
              'focus-visible:outline-border-brand relative z-10 flex size-5 shrink-0 cursor-pointer touch-manipulation items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2',
              // 보이는 크기는 20px로 두고 터치 영역만 40px로 넓힘(Medium 아이콘 기준)
              "before:absolute before:-inset-2.5 before:content-['']",
              selected ? 'text-text-brand' : 'text-text-tertiary',
            )}
          >
            <LineChevronRightMediumIcon aria-hidden="true" />
          </button>
        </div>
        {chips.length > 0 && (
          <ul aria-label="참여 멤버" className="gap-s3 flex w-full items-center overflow-hidden">
            {chips.map((chip, index) => (
              <li key={`${chip}-${index}`} className="shrink-0">
                <ColorBadge color={chipColor}>{chip}</ColorBadge>
              </li>
            ))}
          </ul>
        )}
        <div
          className={cn(
            'typography-body-2-regular gap-s6 flex w-full items-center',
            selected ? 'text-text-brand' : 'text-text-tertiary',
          )}
        >
          <span className="flex items-center gap-0.5">
            <LinePhotoSmallIcon aria-hidden="true" />
            {photoCount}장
          </span>
          <span className="flex items-center gap-0.5">
            <LineCalendarSmallIcon aria-hidden="true" />
            {month}월 {day}일
          </span>
        </div>
      </div>
    </div>
  );
};
