import type { ComponentProps } from 'react';
import { LineChevronRightMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type NudgeBannerProps = Omit<ComponentProps<'button'>, 'children' | 'type'> & {
  /** 안내 글자(접근성 이름, 링크·버튼을 넣지 않도록 문자열만, 예: `작성 중인 번들을 완성해 보세요!`) */
  children: string;
};

/**
 * 다음 행동을 권하는 배너(Figma `Label`, `2452:42097`): 회색 바탕·안내 글자·오른쪽 화살표
 * 기본·눌림(overlay-pressed)·비활성(opacity-disabled 40%), 누를 때의 이동은 호출자 담당
 */
export const NudgeBanner = ({ children, className, ...props }: NudgeBannerProps) => (
  <button
    type="button"
    {...props}
    className={cn(
      'bg-surface-secondary rounded-r4 px-padding-p8 py-padding-p7 gap-s4 group flex w-full cursor-pointer touch-manipulation items-center justify-between text-left',
      // 눌림은 바탕 layer로 겹쳐 글자는 그대로 유지
      'enabled:active:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))]',
      'disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
  >
    <span className="typography-label-s text-text-tertiary group-disabled:text-text-disabled min-w-0 wrap-break-word break-keep">
      {children}
    </span>
    <LineChevronRightMediumIcon className="text-icon-quaternary shrink-0" />
  </button>
);
