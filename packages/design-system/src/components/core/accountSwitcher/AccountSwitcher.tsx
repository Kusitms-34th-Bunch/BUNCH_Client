import type { ComponentProps } from 'react';
import { FillConfettiIcon, LineChevronDownIcon } from '../../../icons';
import { cn } from '../../../utils';

export type AccountSwitcherProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** 현재 계정 이름 */
  label: string;
  /** 계정(번치) 대표 이미지 주소. 있으면 28px 원형 이미지, 없으면 색종이 아이콘. 장식이라 접근성 이름은 `label`만 사용 */
  avatarSrc?: string | undefined;
};

/**
 * 현재 계정을 보여 주고 전환 목록을 여는 트리거(Figma `AccountSwitcher`: 대표 이미지 28px·이름 18/27·화살표). 목록 자체와 열림 상태는 호출하는 쪽이 소유
 * 목록을 열면 aria-haspopup·aria-expanded는 호출자가 전달
 */
export function AccountSwitcher({
  label,
  avatarSrc,
  type = 'button',
  className,
  ...props
}: AccountSwitcherProps) {
  return (
    <button
      type={type}
      className={cn(
        'group gap-s4 rounded-r10 p-s3 text-text-primary inline-flex max-w-full cursor-pointer items-center',
        'not-disabled:active:bg-overlay-pressed',
        'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:text-text-disabled disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
        className,
      )}
      {...props}
    >
      {avatarSrc ? (
        <span
          aria-hidden="true"
          className="bg-surface-brand-subtle-2 size-7 shrink-0 overflow-hidden rounded-full"
        >
          <img src={avatarSrc} alt="" className="size-full object-cover" />
        </span>
      ) : (
        <FillConfettiIcon
          size="lg"
          aria-hidden="true"
          className="text-icon-secondary group-disabled:text-icon-disabled shrink-0"
        />
      )}
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
