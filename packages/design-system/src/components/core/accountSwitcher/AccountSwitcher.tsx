import type { ComponentProps } from 'react';
import { LineChevronDownIcon } from '../../../icons';
import { cn } from '../../../utils';

export type AccountSwitcherProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** 현재 계정 이름 */
  label: string;
};

/**
 * 현재 계정을 보여 주고 전환 목록을 여는 트리거(Figma `Account Switcher`: 이름 18/27·화살표). 목록 자체와 열림 상태는 호출하는 쪽이 소유
 * 목록을 열면 aria-haspopup·aria-expanded는 호출자가 전달
 */
export function AccountSwitcher({
  label,
  type = 'button',
  className,
  ...props
}: AccountSwitcherProps) {
  return (
    <button
      type={type}
      className={cn(
        'group rounded-r10 p-s3 text-text-primary inline-flex max-w-full cursor-pointer items-center',
        'not-disabled:active:bg-overlay-hover',
        'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:text-text-disabled disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
        className,
      )}
      {...props}
    >
      <span className="gap-s1 flex min-w-0 items-center">
        <span className="typography-heading-2-semibold min-w-0 truncate">{label}</span>
        <LineChevronDownIcon
          size="lg"
          aria-hidden="true"
          className="text-icon-tertiary group-disabled:text-icon-disabled shrink-0"
        />
      </span>
    </button>
  );
}
