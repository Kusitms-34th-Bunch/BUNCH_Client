import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

// Figma `Size`: L 90, M 64, S 40, XS 34, XXS 24. 토큰에 없는 크기라 기본 scale 적용
const SIZES = {
  L: 'size-22.5',
  M: 'size-16',
  S: 'size-10',
  XS: 'size-8.5',
  XXS: 'size-6',
} as const;

export type ProfileImageSize = keyof typeof SIZES;

export type ProfileImageProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 보여 줄 이미지 주소: 처음에는 기본 프로필 이미지(번치 대표 이미지), 사용자가 고른 뒤에는 선택한 이미지. 없으면 배경색 원만 표시 */
  src?: string | undefined;
  /** 이미지 설명. 비우면 장식 이미지로 숨김 처리 */
  alt?: string | undefined;
  /** 지름: `L` 90px(기본), `M` 64px, `S` 40px, `XS` 34px, `XXS` 24px */
  size?: ProfileImageSize | undefined;
};

/**
 * 프로필 이미지: 원형 이미지(Figma `Profile Image`, 크기 5종)
 * 기본 이미지와 선택한 이미지(Figma `Status`)는 모두 호출하는 쪽이 `src`로 전달(상태 구분은 `src`가 담당)
 * 카메라 버튼은 이 컴포넌트가 그리지 않고, 화면이 `CameraButton`을 오른쪽 아래에 겹쳐 배치
 */
export const ProfileImage = ({
  src,
  alt = '',
  size = 'L',
  className,
  ...props
}: ProfileImageProps) => (
  <div
    className={cn(
      'bg-surface-brand-subtle-2 relative shrink-0 overflow-hidden rounded-full',
      SIZES[size],
      className,
    )}
    {...props}
  >
    {src ? <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" /> : null}
  </div>
);
