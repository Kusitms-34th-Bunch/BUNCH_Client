import type { ComponentProps, ReactNode } from 'react';
import { FillCircleCheckMediumIcon, LineCircleCheckMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type LabelProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  /** 접근성 이름이 되는 글자(예: "필수 항목 모두 체크하기") */
  children: ReactNode;
};

/**
 * 전체 선택 행: 체크박스 하나를 눌러 하위 항목을 한꺼번에 선택·해제하는 용도(Figma `Label - 01`)
 * `className`은 행 전체에, 나머지 props는 native checkbox에 전달. 하위 항목과 묶는 일은 호출하는 쪽이 한다
 * 선택 전은 40% 투명한 모양이고, 선택되면 불투명해진다(Figma의 Disabled → Default)
 */
export const Label = ({ className, children, ...props }: LabelProps) => (
  <label
    className={cn(
      // 눌림: 선택된 모양(채운 아이콘·진한 글자·불투명)에 overlay-pressed(20%)를 아이콘·글자 위까지 덮는다. Figma 실측: 배경 #f1f2ff→#c1c2cc, 아이콘 #a7adff→#868acc
      'group/label rounded-r4 relative isolate block w-full cursor-pointer touch-manipulation',
      'before:bg-overlay-pressed before:rounded-r4 before:pointer-events-none before:absolute before:inset-0 before:z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
      '[&:active:not(:has(input:disabled))]:before:opacity-100',
      // 비활성(disabled)일 때는 눌러도 눌림 모양이 나오지 않는다
      // 포커스 링은 흐려지는 안쪽 행이 아니라 이 바깥 label에 둔다
      'has-[input:focus-visible]:outline-border-brand has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2',
      'has-[input:disabled]:cursor-not-allowed',
      className,
    )}
  >
    <input type="checkbox" className="peer sr-only" {...props} />
    <span className="bg-chip-blue-bg rounded-r4 px-padding-p4 py-padding-p5 gap-s3 flex items-center opacity-(--semantic-opacity-disabled) transition-opacity duration-75 ease-out group-has-[input:checked]/label:opacity-100 group-[:active:not(:has(input:disabled))]/label:opacity-100 motion-reduce:transition-none">
      <LineCircleCheckMediumIcon
        aria-hidden="true"
        className="text-icon-quaternary [&_path]:fill-surface-disabled shrink-0 group-has-[input:checked]/label:hidden group-[:active:not(:has(input:disabled))]/label:hidden"
      />
      <FillCircleCheckMediumIcon
        aria-hidden="true"
        className="text-surface-brand-subtle-2 hidden shrink-0 group-has-[input:checked]/label:block group-[:active:not(:has(input:disabled))]/label:block"
      />
      <span className="typography-heading-2-semibold text-text-disabled group-[:active:not(:has(input:disabled))]/label:text-text-primary group-has-[input:checked]/label:text-text-primary min-w-0">
        {children}
      </span>
    </span>
  </label>
);
