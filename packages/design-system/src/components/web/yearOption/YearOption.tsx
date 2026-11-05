import type { ComponentProps, ReactNode } from 'react';
import { FillCircleCheckMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type YearOptionProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  /** 접근성 이름이 되는 글자(예: "2012") */
  children: ReactNode;
};

/**
 * 연도 선택 행: 목록에서 하나만 고르는 라디오(Figma `Year_Option`)
 * 같은 `name`을 주고 호출하는 쪽이 `fieldset`·`legend` 또는 `radiogroup`으로 묶어 질문 전달
 * `className`은 행 전체에, 나머지 props는 native radio에 전달. 선택되면 오른쪽에 체크 아이콘 표시(Figma의 Pressed)
 */
export const YearOption = ({ className, children, ...props }: YearOptionProps) => (
  <label
    className={cn(
      'typography-body-1-regular text-text-secondary px-padding-p3 py-padding-p2 relative flex w-full cursor-pointer touch-manipulation items-center justify-between',
      'has-[input:focus-visible]:outline-border-brand has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2',
      'has-[input:disabled]:text-text-tertiary has-[input:disabled]:cursor-not-allowed',
      className,
    )}
  >
    <input type="radio" className="peer sr-only" {...props} />
    <span className="min-w-0">{children}</span>
    <FillCircleCheckMediumIcon
      aria-hidden="true"
      className="text-icon-quaternary hidden shrink-0 peer-checked:block"
    />
  </label>
);
