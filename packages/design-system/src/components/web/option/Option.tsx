import type { ComponentProps } from 'react';
import { tv } from '../../../utils';

const option = tv({
  base: 'typography-caption-1-medium inline-block shrink-0 whitespace-nowrap',
  variants: {
    variant: {
      required: 'text-text-brand',
      optional: 'text-text-quaternary',
    },
  },
  defaultVariants: { variant: 'required' },
});

const defaultLabels = { required: '필수', optional: '선택' } as const;

export type OptionVariant = keyof typeof defaultLabels;

export type OptionProps = ComponentProps<'span'> & {
  /** 필수(브랜드 색) 또는 선택(흐린 색). 기본값 `required` */
  variant?: OptionVariant;
};

/**
 * 입력 항목의 필수·선택 표시(Figma `Option`)
 * 글자를 넘기지 않으면 "필수" / "선택" 기본 표시. 표시일 뿐이라 입력 검증 없음
 */
export const Option = ({ variant = 'required', className, children, ...props }: OptionProps) => (
  <span className={option({ variant, className })} {...props}>
    {children ?? defaultLabels[variant]}
  </span>
);
