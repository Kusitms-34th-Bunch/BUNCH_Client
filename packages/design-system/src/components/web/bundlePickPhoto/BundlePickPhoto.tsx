import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type BundlePickPhotoProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 사진 주소 */
  src: string;
  /** 사진 설명(꾸미는 사진이면 빈 문자열) */
  alt: string;
};

/**
 * 번들 픽 화면의 사진 카드(Figma `Bundle Pick Photo`): 295×396, 반경 `r3`(6px)의 사진
 * 사진은 가로세로를 채우며(`object-cover`) 넘치는 부분은 잘림. 크기·흐림 같은 상태는 `className`으로 덮어씀
 */
export const BundlePickPhoto = ({ src, alt, className, ...props }: BundlePickPhotoProps) => (
  <div
    className={cn('rounded-r3 relative h-99 w-73.75 shrink-0 overflow-clip', className)}
    {...props}
  >
    <img src={src} alt={alt} decoding="async" className="absolute inset-0 size-full object-cover" />
  </div>
);
