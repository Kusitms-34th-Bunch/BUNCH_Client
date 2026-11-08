import type { ComponentProps } from 'react';
import { FillCalendarSmallIcon, FillMapPinSmallIcon } from '../../../icons';
import { cn } from '../../../utils';

export type BundleInfoProps = Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  /** 번들 제목 */
  title: string;
  /** 위치 글자(예: 「애월읍 외 1곳」). 없으면 줄을 숨김 */
  location?: string | undefined;
  /** 위치를 눌렀을 때(콕하기 시트). 없으면 위치는 글자로만 보임 */
  onLocationClick?: (() => void) | undefined;
  /** 날짜 글자(예: 「2026년 7월 9일」). 없으면 줄을 숨김 */
  date?: string | undefined;
  /** detail: 상세 화면 흰 배경(제목 20) · overlay: 사진 위 흰 글자(제목 16, 위치·날짜 80% 불투명) */
  variant?: 'detail' | 'overlay' | undefined;
  /** 제목 요소 태그. 기본 h2 */
  titleAs?: 'h1' | 'h2' | 'h3' | 'p' | undefined;
};

/**
 * 번들 제목·위치·날짜(Figma `Bundle Info`, 썸네일 사진 위의 `BundleInfo`)
 * 위치·날짜 유무로 4가지 모양이 되며, 위치는 밑줄 친 글자
 */
export const BundleInfo = ({
  title,
  location,
  onLocationClick,
  date,
  variant = 'detail',
  titleAs: Title = 'h2',
  className,
  ...props
}: BundleInfoProps) => {
  const overlay = variant === 'overlay';
  const row = cn(
    'gap-s3 flex items-center',
    overlay
      ? 'typography-body-4-regular text-text-inversed opacity-80'
      : 'typography-body-3-regular text-text-tertiary',
  );
  const icon = overlay ? 'text-icon-inversed shrink-0' : 'text-icon-quaternary shrink-0';

  return (
    <div className={cn('flex flex-col', overlay ? 'gap-s3' : 'gap-s5', className)} {...props}>
      <Title
        className={cn(
          'wrap-break-word break-keep',
          overlay
            ? 'typography-body-1-semi-bold text-text-inversed'
            : 'typography-heading-1-semibold text-text-secondary',
        )}
      >
        {title}
      </Title>
      {location || date ? (
        <div className="gap-s3 flex flex-col">
          {location ? (
            <div className={row}>
              <FillMapPinSmallIcon aria-hidden className={icon} />
              {onLocationClick ? (
                <button
                  type="button"
                  onClick={onLocationClick}
                  className="focus-visible:outline-border-brand relative flex min-w-0 cursor-pointer touch-manipulation text-left underline before:absolute before:-inset-x-1 before:-inset-y-2 focus-visible:outline-2"
                >
                  <span className="sr-only">위치 </span>
                  {/* 말줄임은 안쪽 글자에 둬 넓힌 누르는 영역이 잘리지 않게 함 */}
                  <span className="truncate">{location}</span>
                </button>
              ) : (
                <span className="min-w-0 truncate underline">
                  <span className="sr-only">위치 </span>
                  {location}
                </span>
              )}
            </div>
          ) : null}
          {date ? (
            <div className={row}>
              <FillCalendarSmallIcon aria-hidden className={icon} />
              <span>
                <span className="sr-only">날짜 </span>
                {date}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
