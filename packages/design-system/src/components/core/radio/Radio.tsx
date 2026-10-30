import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type RadioProps = Omit<ComponentProps<'input'>, 'type' | 'children'>;

/**
 * 20px 원형 라디오(Figma `Control Radio`): native 라디오를 투명하게 덮고 보이는 원은 따로 그림
 * 접근성 이름·그룹(`name`·`fieldset`)은 호출하는 쪽 담당, `className`은 바깥 래퍼에 적용
 */
export const Radio = ({ className, ...props }: RadioProps) => (
  <span
    className={cn(
      'has-focus-visible:outline-border-brand relative inline-flex size-5 shrink-0 touch-manipulation rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
      className,
    )}
  >
    <input
      type="radio"
      className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
      {...props}
    />
    <span
      aria-hidden="true"
      className={cn(
        'bg-surface-primary border-border-tertiary pointer-events-none relative size-full rounded-full border',
        'before:absolute before:top-1/2 before:left-1/2 before:size-3 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:opacity-0',
        'peer-checked:border-icon-brand peer-checked:before:bg-icon-brand peer-checked:before:opacity-100',
        // 누르는 동안(선택 전): 회색 링과 점
        'peer-[:active:not(:checked,:disabled)]:border-icon-disabled peer-[:active:not(:checked,:disabled)]:before:bg-icon-disabled peer-[:active:not(:checked,:disabled)]:before:opacity-100',
        // 비활성: 흰 배경 위에 hover 겹침
        'peer-disabled:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]',
        // 강제 색상 모드: 배경색이 덮여 점이 사라지는 것 방지
        'forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:forced-color-adjust-none forced-colors:peer-checked:before:bg-[CanvasText]',
      )}
    />
  </span>
);
