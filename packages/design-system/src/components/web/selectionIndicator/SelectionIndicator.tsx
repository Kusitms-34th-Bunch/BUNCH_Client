import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type SelectionIndicatorProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** 선택 여부(Figma `Selected`). 선택되면 흰 원에 선택 순서를 표시 */
  selected?: boolean;
  /** 선택된 순서(예: 1). 선택되지 않았을 때는 표시하지 않음 */
  order?: ReactNode;
};

/**
 * 선택 인디케이터(Figma `Selection Indicator`): 20px 원
 * 선택 전은 반투명 흰 원(60%)+흰 테두리, 선택 후는 흰 원 안에 선택 순서(14/21 SemiBold)
 * 기본은 장식(`aria-hidden`)이라 선택 상태·순서는 감싸는 요소가 전달. 단독으로 쓸 때만 `aria-hidden={false}`와 `role="img"`·`aria-label` 전달
 */
export const SelectionIndicator = ({
  selected = false,
  order,
  className,
  ...props
}: SelectionIndicatorProps) => (
  <span
    aria-hidden="true"
    className={cn(
      'typography-body-2-meduim box-border inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-white text-black',
      // 선택 전후 배경 전환은 150ms(Figma 화면 설계서 사진 선택 Interaction)
      'transition-colors duration-150 ease-[cubic-bezier(0,0,0.35,1)] motion-reduce:transition-none',
      selected ? 'bg-white' : 'bg-white/60',
      className,
    )}
    {...props}
  >
    {selected ? order : null}
  </span>
);
