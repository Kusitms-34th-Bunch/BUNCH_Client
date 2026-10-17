import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type StepperProps = Omit<
  ComponentProps<'div'>,
  'children' | 'role' | 'aria-valuemin' | 'aria-valuemax' | 'aria-valuenow'
> & {
  /** 전체 단계 수(1 이상) */
  total: number;
  /** 현재 진행 중인 단계(1부터). 이 단계의 막대만 채워진다 */
  current: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// NaN·Infinity 같은 잘못된 값은 fallback으로 되돌린다
const toInteger = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.floor(value) : fallback;

/**
 * 단계 진행 표시줄: 높이 4px 막대를 단계 수만큼 같은 폭으로 나눠 보여 준다
 * 막대는 보이는 표시일 뿐이라 진행 상황은 progressbar 값과 `aria-valuetext`로 전달한다
 */
export const Stepper = ({
  total,
  current,
  className,
  'aria-label': ariaLabel = '진행 단계',
  'aria-valuetext': ariaValueText,
  ...props
}: StepperProps) => {
  const count = Math.max(1, toInteger(total, 1));
  const step = clamp(toInteger(current, 1), 1, count);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={step}
      aria-valuetext={ariaValueText ?? `${count}단계 중 ${step}단계`}
      className={cn('gap-s1 flex w-full items-center', className)}
      {...props}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            'h-s2 min-w-px flex-1 rounded-full',
            index === step - 1 ? 'bg-surface-brand-subtle-2' : 'bg-surface-disabled',
          )}
        />
      ))}
    </div>
  );
};
