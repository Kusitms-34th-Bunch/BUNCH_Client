import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type PageNumberProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** 표시할 페이지 번호 */
  page: number;
  /** 현재 페이지면 true */
  selected?: boolean | undefined;
};

/**
 * 어드민 페이지 번호 버튼(Figma `어드민 컴포넌트` > `Page Number`): Default·Hover·Selected·Disabled
 * 현재 페이지는 `aria-current="page"`. 번호 묶음(`<nav>`)·이동은 호출자 담당
 */
export const PageNumber = ({
  page,
  selected = false,
  type = 'button',
  className,
  ...props
}: PageNumberProps) => (
  <button
    type={type}
    aria-current={selected ? 'page' : undefined}
    className={cn(
      // 한두 자리는 Figma 24×24 그대로, 세 자리 이상은 폭만 늘어남
      'typography-body-4-regular rounded-r2 relative inline-flex h-6 min-w-6 shrink-0 cursor-pointer items-center justify-center px-1',
      selected
        ? 'bg-surface-inversed-lighter text-text-inversed'
        : [
            'text-text-tertiary',
            // Hover 덮개는 글자 위까지 덮어 글자도 함께 어둡게(Figma Hover 글자색 = 토큰 색 + 검정 10%)
            'before:bg-overlay-hover before:rounded-r2 before:pointer-events-none before:absolute before:inset-0 before:opacity-0',
            'not-disabled:hover:before:opacity-100',
            // Figma Disabled 글자색(현재 페이지는 어두운 바탕이라 글자색은 그대로 두고 흐림만)
            'disabled:text-text-disabled',
          ],
      'disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
    {...props}
  >
    {page}
  </button>
);
