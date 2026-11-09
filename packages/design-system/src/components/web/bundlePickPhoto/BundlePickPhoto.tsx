import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type BundlePickPhotoProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 사진 주소 */
  src: string;
  /** 사진 설명(꾸미는 사진이면 빈 문자열) */
  alt: string;
};

/**
 * 번들 픽 화면의 사진 카드(Figma `Bundle Pick Photo`): 295×396, 반경 `r3`
 * `className`은 카드 틀에 적용
 */
export const BundlePickPhoto = ({ src, alt, className, ...props }: BundlePickPhotoProps) => (
  <div
    className={cn('rounded-r3 relative h-99 w-73.75 shrink-0 overflow-hidden', className)}
    {...props}
  >
    <img src={src} alt={alt} decoding="async" className="absolute inset-0 size-full object-cover" />
  </div>
);
