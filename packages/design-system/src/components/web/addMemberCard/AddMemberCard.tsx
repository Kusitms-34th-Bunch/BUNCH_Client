import type { ComponentProps } from 'react';
import { LineAddMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

// 비활성은 Figma에 모양이 없어 `disabled`를 받지 않음(정해지면 추가)
export type AddMemberCardProps = Omit<ComponentProps<'button'>, 'children' | 'disabled'> & {
  /** 카드의 글자(기본 "추가") */
  label?: string | undefined;
};

/**
 * 멤버 추가 카드(Figma `Member Card`, `Variant=add`): 흰 바탕에 테두리, 더하기 원과 "추가" 글자
 * 멤버를 추가하는 동작은 `onClick`으로 호출하는 쪽이 정하며 `className`은 카드에 적용
 */
export const AddMemberCard = ({
  type = 'button',
  label = '추가',
  className,
  ...props
}: AddMemberCardProps) => (
  <button
    type={type}
    className={cn(
      'bg-surface-primary border-border-secondary px-padding-p7 py-s4 gap-s5 rounded-r4 inline-flex shrink-0 cursor-pointer touch-manipulation flex-col items-center border',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
    {...props}
  >
    <span
      aria-hidden="true"
      className="bg-surface-secondary text-text-quaternary flex size-10 items-center justify-center rounded-full"
    >
      <LineAddMediumIcon />
    </span>
    <span className="typography-body-3-regular text-text-quaternary">{label}</span>
  </button>
);
