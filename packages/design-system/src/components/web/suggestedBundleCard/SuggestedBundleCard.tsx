'use client';

import { type ComponentProps, useLayoutEffect, useRef, useState } from 'react';
import {
  LineCalendarSmallIcon,
  LineChevronRightMediumIcon,
  LinePhotoSmallIcon,
} from '../../../icons';
import { cn } from '../../../utils';
import { ColorBadge } from '../colorBadge';
import { fitChipCount } from './fitMemberChips.internal';

export type SuggestedBundleCardProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 번들 대표 사진 */
  imageSrc: string;
  /** 번들 이름 */
  title: string;
  /** 참여 멤버 이름(한 줄에 다 안 들어가거나 `maxVisibleMembers`개를 넘으면 마지막 칩이 "마지막 멤버 외 N명"으로 줄어듦) */
  members: string[];
  /** 번들에 포함된 사진 수 */
  photoCount: number;
  /** 촬영 날짜의 월(1~12) */
  month: number;
  /** 촬영 날짜의 일 */
  day: number;
  /** 연도. 올해가 아닌 번들만 넘기면 날짜 앞에 `2025년`처럼 붙음 */
  year?: number | undefined;
  /** 자정을 넘겨 이은 번들의 끝 날짜(일이 있어야 `~20일`처럼 붙음). 월이 같거나 없으면 월은 생략 */
  endMonth?: number | undefined;
  endDay?: number | undefined;
  /** 선택된 카드(Figma `Selected`) */
  selected?: boolean | undefined;
  /** 마지막 요약 칩을 포함해 보여 줄 칩 수의 상한(기본 6개). 줄 너비가 모자라면 이보다 더 줄어듦 */
  maxVisibleMembers?: number | undefined;
  /** 대표 사진의 대체 텍스트(기본은 번들 이름이 옆에 있어 장식으로 숨김) */
  imageAlt?: string | undefined;
  /** 카드를 눌렀을 때(선택 전환은 호출하는 쪽 담당) */
  onCardClick?: (() => void) | undefined;
  /** 오른쪽 화살표를 눌러 추천 번들 상세로 이동할 때 */
  onDetailClick?: (() => void) | undefined;
};

type DateParts = Pick<SuggestedBundleCardProps, 'year' | 'month' | 'day' | 'endMonth' | 'endDay'>;

// 연도(올해가 아닐 때)와 끝 날짜(이틀에 걸친 번들)를 붙인 날짜 글자. 예: `2025년 10월 19일~20일`
const formatDate = ({ year, month, day, endMonth, endDay }: DateParts) => {
  const start = `${year === undefined ? '' : `${year}년 `}${month}월 ${day}일`;
  if (endDay === undefined) return start;
  return `${start}~${endMonth === undefined || endMonth === month ? '' : `${endMonth}월 `}${endDay}일`;
};

// 스크린 리더용 기간 문구. 예: `2025년 10월 19일부터 20일까지`, `10월 31일부터 11월 1일까지`
const formatSpokenRange = ({ year, month, day, endMonth, endDay }: DateParts) => {
  const start = `${year === undefined ? '' : `${year}년 `}${month}월 ${day}일`;
  const end = `${endMonth === undefined || endMonth === month ? '' : `${endMonth}월 `}${endDay}일`;
  return `${start}부터 ${end}까지`;
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
  year,
  endMonth,
  endDay,
  selected = false,
  maxVisibleMembers = 6,
  imageAlt = '',
  onCardClick,
  onDetailClick,
  className,
  ...props
}: SuggestedBundleCardProps) => {
  const cap = Number.isFinite(maxVisibleMembers) ? Math.max(1, Math.floor(maxVisibleMembers)) : 6;
  const capCount = Math.min(cap, members.length);
  // 한 줄에 들어가는 칩 수는 화면에서 재야 알 수 있어 잰 값이 있으면 쓰고(상한 이하), 없으면 상한만 따름
  const listRef = useRef<HTMLUListElement>(null);
  const probeRef = useRef<HTMLUListElement>(null);
  const [fitCount, setFitCount] = useState<number | undefined>(undefined);
  const total = members.length;
  const membersKey = JSON.stringify(members);
  useLayoutEffect(() => {
    const list = listRef.current;
    const probe = probeRef.current;
    if (!list || !probe) return;
    const measure = () => {
      // 너비를 못 재는 환경(숨김·테스트)에서는 상한만 따름
      if (list.clientWidth <= 0) return setFitCount(undefined);
      const widths = (kind: string) =>
        [...probe.querySelectorAll(`[data-chip="${kind}"]`)].map(
          (item) => item.getBoundingClientRect().width,
        );
      setFitCount(
        fitChipCount({
          plainWidths: widths('plain'),
          summaryWidths: widths('summary'),
          total,
          gap: Number.parseFloat(getComputedStyle(probe).columnGap) || 0,
          available: list.clientWidth,
          cap,
        }),
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    // 카드 너비가 바뀔 때와 글꼴이 늦게 불러와 칩 너비가 바뀔 때 다시 잼
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(probe);
    return () => observer.disconnect();
    // 칩 너비는 DOM에서 재므로 멤버 이름이 바뀌면(membersKey) 다시 잼
  }, [membersKey, total, cap]);
  const chipCount = Math.min(capCount, fitCount ?? capCount);
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
          <div className="relative w-full">
            <ul
              ref={listRef}
              aria-label="참여 멤버"
              className="gap-s3 flex w-full items-center overflow-hidden"
            >
              {chips.map((chip, index) => (
                <li key={`${chip}-${index}`} className="shrink-0">
                  <ColorBadge color={chipColor}>{chip}</ColorBadge>
                </li>
              ))}
            </ul>
            {/* 칩 너비를 재는 숨긴 줄: 글자는 DOM 글자가 아니라 CSS content로 그려 글자 조회·낭독에 잡히지 않게 함 */}
            <ul
              ref={probeRef}
              aria-hidden="true"
              className="gap-s3 pointer-events-none invisible absolute top-0 left-0 flex w-max items-center"
            >
              {members.slice(0, capCount).map((name, index) => (
                <li key={`plain-${index}`} data-chip="plain" className="shrink-0">
                  <ColorBadge color={chipColor}>
                    <span data-text={name} className="before:content-[attr(data-text)]" />
                  </ColorBadge>
                </li>
              ))}
              {members.slice(0, capCount).map((name, index) =>
                index + 1 < members.length ? (
                  <li key={`summary-${index}`} data-chip="summary" className="shrink-0">
                    <ColorBadge color={chipColor}>
                      <span
                        data-text={`${name} 외 ${members.length - index - 1}명`}
                        className="before:content-[attr(data-text)]"
                      />
                    </ColorBadge>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        )}
        <div
          className={cn(
            'typography-body-3-regular gap-s6 flex w-full items-center',
            selected ? 'text-text-brand' : 'text-text-tertiary',
          )}
        >
          <span className="flex items-center gap-0.5">
            <LinePhotoSmallIcon aria-hidden="true" />
            {photoCount}장
          </span>
          <span className="flex items-center gap-0.5">
            <LineCalendarSmallIcon aria-hidden="true" />
            {endDay === undefined ? (
              formatDate({ year, month, day })
            ) : (
              <>
                {/* 물결표(~)는 스크린 리더마다 읽는 방식이 달라 기간은 「부터 ~까지」로 풀어 읽게 함 */}
                <span aria-hidden="true">{formatDate({ year, month, day, endMonth, endDay })}</span>
                <span className="sr-only">
                  {formatSpokenRange({ year, month, day, endMonth, endDay })}
                </span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
