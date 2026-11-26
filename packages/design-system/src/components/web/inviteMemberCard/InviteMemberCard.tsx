import type { ComponentProps } from 'react';
import { LineChevronRightMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type InviteMemberCardProps = Omit<
  ComponentProps<'button'>,
  'children' | 'title' | 'type' | 'disabled'
> & {
  title: string;
  description: string;
};

/**
 * 멤버 초대 진입 카드: 누르면 초대 흐름으로 이동하는 버튼
 * 이동은 호출하는 쪽이 `onClick`으로 처리(링크 의미 없음). 눌려 있는 동안만 어둡게 표시
 */
export const InviteMemberCard = ({
  title,
  description,
  className,
  ...props
}: InviteMemberCardProps) => (
  <button
    type="button"
    className={cn(
      'gap-s8 p-s10 rounded-r7 bg-surface-secondary relative isolate flex w-full cursor-pointer touch-manipulation items-start text-left',
      // 눌림 표시는 글자 뒤 덮개로 겹침, 전환은 공통 press-overlay(#583)
      'press-overlay before:rounded-r7 before:bg-overlay-hover before:-z-10 active:before:opacity-100',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
    {...props}
  >
    <span className="gap-s2 flex min-w-0 flex-1 flex-col wrap-break-word break-keep">
      <span className="typography-body-1-semi-bold text-text-primary">{title}</span>
      <span className="typography-body-4-regular text-text-tertiary">{description}</span>
    </span>
    <LineChevronRightMediumIcon className="text-icon-quaternary shrink-0" />
  </button>
);
