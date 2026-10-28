import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type CalendarItemProps = Omit<
  ComponentProps<'button'>,
  'children' | 'disabled' | 'hidden' | 'type'
> & {
  /** 날짜 글자(예: 4) */
  children?: ReactNode;
  /** 선택된 날짜(Figma `Selected`) */
  selected?: boolean | undefined;
  /** 고를 수 없는 날짜(Figma `Disabled`), 포커스는 받되 눌러도 동작하지 않음 */
  disabled?: boolean | undefined;
  /** 달력 칸만 차지하고 보이지 않는 칸(Figma `hidden`), 다른 달의 칸에 씀 */
  hidden?: boolean | undefined;
};

/**
 * 캘린더의 날짜 한 칸(Figma `Calender Item`): 46px 원, Active·Pressed·Selected·Disabled·hidden
 * 선택 표시(`aria-selected` 등)는 이 칸을 감싸는 쪽(예: `Calendar`의 gridcell)이 맡고 `className`은 칸에 적용
 */
export const CalendarItem = ({
  children,
  selected = false,
  disabled = false,
  hidden = false,
  className,
  onClick,
  ...props
}: CalendarItemProps) => {
  // span은 기본이 inline이라 크기가 먹히지 않으므로 block으로 칸 크기를 유지
  if (hidden)
    return <span aria-hidden="true" className={cn('block size-11.5 shrink-0', className)} />;

  return (
    <button
      type="button"
      {...props}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'typography-body-1-medium relative isolate flex size-11.5 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full',
        // 윤곽선이 뒤에 오는 이웃 칸의 배경에 가려지지 않게 포커스된 칸을 위로 올림
        'focus-visible:outline-border-brand focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2',
        selected
          ? 'bg-surface-inversed text-text-inversed'
          : [
              'bg-surface-primary text-text-primary',
              // 눌림은 칸 위에 겹쳐 글자까지 함께 어두워지게 처리
              'before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-full before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
              '[&:not([aria-disabled=true])]:active:before:opacity-100',
            ],
        // 선택된 칸은 비활성이어도 어두운 배경에 흰 글자를 유지(연한 글자가 어두운 배경에 묻히지 않게 처리)
        disabled && 'cursor-not-allowed',
        disabled && !selected && 'text-text-quaternary',
        className,
      )}
    >
      {children}
    </button>
  );
};
