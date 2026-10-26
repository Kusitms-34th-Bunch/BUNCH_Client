import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';
import { Radio } from '../../core/radio';

export type RadioCardProps = Omit<ComponentProps<'input'>, 'type' | 'children' | 'disabled'> & {
  children: ReactNode;
};

/**
 * 글자 한 줄의 선택 카드(Figma `Radio Card`): 같은 `name`의 카드 중 하나를 고르는 라디오
 * 그룹 묶음(`fieldset`·`legend`)과 선택 값은 호출하는 쪽 담당, `className`은 카드에 적용
 */
export const RadioCard = ({ className, children, ...props }: RadioCardProps) => (
  <label
    className={cn(
      'bg-surface-secondary pl-padding-p8 pr-padding-p8 gap-s3 rounded-r4 relative isolate flex h-13.5 w-full cursor-pointer touch-manipulation items-center',
      // hover는 카드 위에 겹쳐 라디오 원까지 함께 어두워지게 처리
      'before:rounded-r4 before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:z-10 before:opacity-0',
      'hover:not-has-checked:before:opacity-100',
      'has-checked:bg-surface-brand-subtle-1 has-checked:ring-surface-brand-subtle-2 has-checked:ring-1 has-checked:ring-inset',
      'has-focus-visible:outline-border-brand has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
      className,
    )}
  >
    <Radio className="has-focus-visible:outline-0" {...props} />
    <span className="typography-body-3-regular text-text-tertiary min-w-0 truncate">
      {children}
    </span>
  </label>
);
