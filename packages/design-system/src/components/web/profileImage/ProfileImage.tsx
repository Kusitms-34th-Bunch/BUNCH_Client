import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type ProfileImageProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 보여 줄 이미지 주소: 처음에는 기본 프로필 이미지(번치 대표 이미지), 사용자가 고른 뒤에는 선택한 이미지. 없으면 배경색 원만 보인다 */
  src?: string | undefined;
  /** 이미지 설명. 비우면 장식 이미지로 숨겨진다 */
  alt?: string | undefined;
};

/**
 * 프로필 이미지: 90px 원형 이미지
 * 기본 이미지와 선택한 이미지는 모두 호출하는 쪽이 `src`로 넘긴다(상태 구분은 `src`가 담당)
 * 카메라 버튼은 이 컴포넌트가 그리지 않고, 화면이 `CameraButton`을 오른쪽 아래에 겹쳐 놓는다
 */
export const ProfileImage = ({ src, alt = '', className, ...props }: ProfileImageProps) => (
  <div
    className={cn(
      // Figma 90px는 토큰에 없어 기본 scale(size-22.5) 적용
      'bg-surface-brand-subtle-2 relative size-22.5 shrink-0 overflow-hidden rounded-full',
      className,
    )}
    {...props}
  >
    {src ? <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" /> : null}
  </div>
);
