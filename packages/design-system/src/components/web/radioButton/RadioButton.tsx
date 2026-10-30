import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type RadioButtonProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  /** 접근성 이름이 되는 글자 */
  children: ReactNode;
};

/**
 * 16px 라디오 + 글자 한 줄(Figma `Radio Button`, 컨트롤은 `Control Radio - S`): 행 어디를 눌러도 선택
 * `core/radio`(20px·브랜드 색)와 다른 회색 컨트롤. 그룹(`name`·`fieldset`)은 호출자 담당, `className`은 행에 적용
 */
export const RadioButton = ({ children, className, ...props }: RadioButtonProps) => (
  <label
    className={cn(
      'gap-s4 px-padding-p4 py-padding-p2 rounded-r4 flex w-full cursor-pointer touch-manipulation items-center',
      'has-[input:focus-visible]:outline-border-brand has-[input:focus-visible]:outline-2',
      'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-(--semantic-opacity-disabled)',
      className,
    )}
  >
    <span className="relative inline-flex size-4 shrink-0">
      <input
        type="radio"
        className="peer absolute inset-0 m-0 size-full cursor-[inherit] appearance-none opacity-0"
        {...props}
      />
      {/* Figma SVG 값: 기본 0.8px border-tertiary 테두리, 선택 1px 링·지름 9.6px 점 icon-tertiary */}
      <span
        aria-hidden="true"
        className={cn(
          'bg-surface-primary border-border-tertiary pointer-events-none relative size-full rounded-full border-[0.8px]',
          'before:bg-icon-tertiary before:absolute before:top-1/2 before:left-1/2 before:size-[9.6px] before:-translate-1/2 before:rounded-full before:opacity-0',
          'peer-checked:border-icon-tertiary peer-checked:border peer-checked:before:opacity-100',
          'forced-colors:border-[CanvasText] forced-colors:forced-color-adjust-none forced-colors:peer-checked:before:bg-[CanvasText]',
          'forced-colors:peer-disabled:border-[GrayText] forced-colors:peer-disabled:before:bg-[GrayText]',
        )}
      />
    </span>
    <span className="typography-body-3-semi-bold text-text-secondary min-w-0 wrap-break-word break-keep">
      {children}
    </span>
  </label>
);
