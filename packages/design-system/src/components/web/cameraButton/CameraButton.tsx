import type { ComponentProps } from 'react';
import { FillCameraSmallIcon } from '../../../icons';
import { cn } from '../../../utils';

export type CameraButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> & {
  /** 아이콘만 있는 버튼이라 접근성 이름이 필요하다(예: "프로필 사진 변경") */
  'aria-label': string;
};

// 눌림 오버레이: 아이콘 위까지 덮는 pseudo 요소, overlay-pressed(20%). Figma 실측: 배경 #535a61→#42484e, 아이콘 흰색→#ccc
// 누르는 동안 Pressed, 다른 버튼과 같은 75ms ease-out 전환(디자이너 공통 지침)
// after: 보이는 28px보다 넓은 40px 터치 영역(design-system-icons.md의 Small 기준)
/**
 * 카메라 버튼(S): 28px 원형 아이콘 버튼
 * 촬영·선택·업로드는 호출하는 쪽이 처리하고, 처리 중에는 `disabled`를 넘긴다
 */
export const CameraButton = ({ type = 'button', className, ...props }: CameraButtonProps) => (
  <button
    type={type}
    className={cn(
      // Figma 28px는 토큰에 없어 기본 scale(size-7) 적용. 배경은 Figma surface-inversed-lighter(#535a61)와 같은 값의 icon-tertiary
      'bg-icon-tertiary text-icon-inversed relative isolate inline-flex size-7 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full',
      'before:bg-overlay-pressed before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
      'not-disabled:active:before:opacity-100',
      'after:absolute after:-inset-1.5 after:content-[""] disabled:after:hidden',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      'disabled:text-icon-disabled disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
      className,
    )}
    {...props}
  >
    <FillCameraSmallIcon aria-hidden="true" />
  </button>
);
