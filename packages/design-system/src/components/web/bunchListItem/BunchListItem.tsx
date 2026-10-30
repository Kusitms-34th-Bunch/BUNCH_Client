import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type BunchListItemStatus = 'default' | 'current' | 'unavailable';

export type BunchListItemProps = Omit<
  ComponentProps<'button'>,
  'children' | 'type' | 'disabled'
> & {
  /** 번치 이름(접근성 이름) */
  name: string;
  /** 번치 대표 이미지. 없으면 빈 원 표시 */
  imageSrc?: string | undefined;
  /** 이름 옆 표시(예: 알림 개수 `ColorBadge`). `unavailable`이면 오른쪽 끝에 배치 */
  badge?: ReactNode;
  /** `current`(지금 보고 있는 번치)와 `unavailable`(접근 불가)은 흐리게 표시하고 선택 불가 */
  status?: BunchListItemStatus | undefined;
};

/**
 * 번치 목록 한 줄(Figma 번치 전환 시트의 `Label - 01`): 36px 대표 이미지 + 이름 + 표시
 * Figma 기본·흐림(opacity-disabled 40%) 상태 기준, 누르는 동안 overlay-hover(10%)
 */
export const BunchListItem = ({
  name,
  imageSrc,
  badge,
  status = 'default',
  className,
  onClick,
  ...props
}: BunchListItemProps) => {
  const isSelectable = status === 'default';

  return (
    // disabled 대신 aria-disabled: 현재·접근 불가 번치도 초점 이동으로 상태 확인
    <button
      type="button"
      {...props}
      aria-disabled={isSelectable ? undefined : true}
      aria-current={status === 'current' ? 'true' : undefined}
      onClick={isSelectable ? onClick : undefined}
      className={cn(
        'rounded-r4 px-padding-p5 py-padding-p3 gap-s5 relative isolate flex w-full touch-manipulation items-center text-left',
        'before:rounded-r4 before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
        'not-aria-disabled:cursor-pointer not-aria-disabled:active:before:opacity-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-(--semantic-opacity-disabled)',
        'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
    >
      <span className="bg-surface-secondary size-9 shrink-0 overflow-hidden rounded-full">
        {imageSrc ? <img src={imageSrc} alt="" className="size-full object-cover" /> : null}
      </span>
      <span
        className={cn(
          'gap-s3 flex min-w-0 flex-1 items-center',
          status === 'unavailable' && 'justify-between',
        )}
      >
        <span
          className={cn(
            'typography-body-1-medium min-w-0 truncate',
            status === 'unavailable' ? 'text-text-disabled' : 'text-text-primary',
          )}
        >
          {name}
          {status === 'current' ? <span className="sr-only">, 현재 번치</span> : null}
        </span>
        {/* 이름과 표시 글자가 붙어 읽히지 않게 숨긴 쉼표 */}
        {badge ? (
          <span className="shrink-0">
            <span className="sr-only">, </span>
            {badge}
          </span>
        ) : null}
      </span>
    </button>
  );
};
