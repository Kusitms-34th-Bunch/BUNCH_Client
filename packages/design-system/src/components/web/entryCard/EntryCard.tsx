import type { ComponentProps, ReactNode } from 'react';
import { LineChevronRightMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type EntryCardProps = Omit<
  ComponentProps<'button'>,
  'children' | 'title' | 'type' | 'disabled'
> & {
  title: string;
  description: string;
  /** 카드 전체를 덮는 배경 사진 주소. 장식이라 접근성에서 숨김 */
  imageSrc: string;
  /** 왼쪽 아래에 놓일 그래픽 아이콘(48px). 장식이라 접근성에서 숨김 */
  graphic: ReactNode;
};

/**
 * 사진 배경 진입 카드(Figma `Entry Card`): 누르면 바로 다음 흐름으로 이동하는 버튼
 * 선택 상태 없이 눌려 있는 동안만 사진이 어두워진다. 이동은 호출하는 쪽이 `onClick`으로 처리(링크 의미 없음)
 */
export const EntryCard = ({
  title,
  description,
  imageSrc,
  graphic,
  className,
  ...props
}: EntryCardProps) => (
  <button
    type="button"
    className={cn(
      'group rounded-r8 p-s10 gap-s6 relative isolate flex min-h-52.5 w-full cursor-pointer touch-manipulation flex-col items-start justify-end overflow-hidden text-left',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
    {...props}
  >
    <img
      src={imageSrc}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="absolute inset-0 -z-10 size-full object-cover object-bottom"
    />
    {/* Figma Default는 overlay-dim-subtle, Pressed는 overlay-scrim */}
    <span
      aria-hidden="true"
      className="bg-overlay-dim-subtle group-active:bg-overlay-scrim pointer-events-none absolute inset-0 -z-10"
    />
    {/* Figma 그라데이션(아래가 가장 진함)은 토큰이 없어 값을 그대로 옮김 */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-29.5 bg-[linear-gradient(to_top,rgb(0_0_0/0.6)_16.499%,rgb(0_0_0/0.4)_54.139%,rgb(0_0_0/0.08)_90.299%,rgb(0_0_0/0)_98.68%)]"
    />
    <span aria-hidden="true" className="flex shrink-0">
      {graphic}
    </span>
    <span className="flex w-full items-start justify-between">
      <span className="gap-s1 flex min-w-0 flex-1 flex-col wrap-break-word break-keep">
        <span className="typography-heading-2-semibold text-text-inversed">{title}</span>
        <span className="typography-body-4-regular text-text-quinary">{description}</span>
      </span>
      <LineChevronRightMediumIcon className="text-icon-inversed shrink-0" />
    </span>
  </button>
);
