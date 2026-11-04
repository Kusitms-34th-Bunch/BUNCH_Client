import type { ComponentProps } from 'react';
import { LineCheckMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type CheckboxProps = Omit<ComponentProps<'input'>, 'type' | 'children'>;

/**
 * 24px 사각 체크박스(Figma `Checkbox`): native 체크박스를 투명하게 덮고 보이는 상자와 체크는 따로 그림
 * 접근성 이름·그룹(`fieldset`)은 호출하는 쪽 담당, `className`은 바깥 래퍼에 적용
 */
export const Checkbox = ({ className, ...props }: CheckboxProps) => (
  <span
    className={cn(
      'has-focus-visible:outline-border-brand rounded-r2 size-s12 relative inline-flex shrink-0 touch-manipulation has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
      className,
    )}
  >
    <input
      type="checkbox"
      className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
      {...props}
    />
    <span
      aria-hidden="true"
      className={cn(
        'bg-surface-primary border-border-secondary rounded-r2 pointer-events-none size-full border',
        'peer-checked:bg-surface-inversed-lighter peer-checked:border-surface-inversed-lighter',
        // 누르는 동안(선택 전): 흰 상자 위에 pressed 겹침, 감싸는 label을 누를 때도 같은 모양
        'peer-[:active:not(:checked,:disabled)]:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))]',
        '[label:active_.peer:not(:checked,:disabled)~&]:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))]',
        // 비활성: 회색 상자를 40%로 흐리게(선택 여부와 무관)
        'peer-disabled:bg-icon-disabled peer-disabled:border-border-disabled peer-disabled:opacity-(--semantic-opacity-disabled)',
        'forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:forced-color-adjust-none forced-colors:peer-checked:bg-[CanvasText]',
      )}
    />
    <LineCheckMediumIcon className="text-icon-inversed pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 peer-[:checked:disabled]:opacity-(--semantic-opacity-disabled) forced-colors:text-[Canvas]" />
  </span>
);
