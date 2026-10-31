import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type PageCounterProps = Omit<ComponentProps<'span'>, 'children' | 'role'> & {
  /** 현재 페이지(1부터) */
  current: number;
  /** 전체 페이지 수 */
  total: number;
  /** 보조 기술이 읽는 글자(기본 "{현재} / {전체}") */
  label?: string | undefined;
};

/**
 * 페이지 카운터(Figma `Page Counter`): 사진 위에 얹어 "1/4"처럼 현재 위치를 알리는 반투명 알약
 * 사진 위의 위치는 호출하는 쪽이 `className`으로 정하며, 숫자 범위 보정은 하지 않고 받은 값을 그대로 보여 줌
 */
export const PageCounter = ({ current, total, label, className, ...props }: PageCounterProps) => (
  <span
    role="img"
    // 빈 문자열 label은 이름 없는 이미지가 되므로 기본 글자로 대체
    aria-label={label || `${current} / ${total}`}
    className={cn(
      // 검정 30%는 토큰에 없어 Figma 값을 그대로 지정
      'typography-body-4-regular text-text-inversed px-s6 py-s2 inline-flex items-center justify-center rounded-full bg-[rgba(0,0,0,0.3)] backdrop-blur-[5px]',
      className,
    )}
    {...props}
  >
    <span aria-hidden="true">
      {current}/{total}
    </span>
  </span>
);
