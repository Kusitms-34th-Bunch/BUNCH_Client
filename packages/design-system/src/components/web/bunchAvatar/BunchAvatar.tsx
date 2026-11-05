import type { ComponentProps } from 'react';
import { FillCameraLargeIcon } from '../../../icons';
import { cn } from '../../../utils';

export type BunchAvatarProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 번치 대표 이미지 주소. 없으면 이미지 없는 빈 원으로 표시 */
  src?: string | undefined;
  /** 이미지 설명. 비우면 장식 이미지로 숨김 처리 */
  alt?: string | undefined;
  /** 있으면 오른쪽 아래에 카메라 버튼을 그리고 누를 때 호출한다. 촬영·선택·업로드는 호출하는 쪽이 처리 */
  onCameraClick?: (() => void) | undefined;
  /** 카메라 버튼의 접근성 이름 */
  cameraLabel?: string | undefined;
};

/**
 * 번치 대표 이미지: 원형 이미지와 오른쪽 아래 카메라 버튼
 * 기본 이미지(이미지가 없을 때 보일 그림)는 호출하는 쪽이 `src`로 전달
 */
export const BunchAvatar = ({
  src,
  alt = '',
  onCameraClick,
  cameraLabel = '사진 변경',
  className,
  ...props
}: BunchAvatarProps) => (
  <div
    className={cn(
      // Figma 154×158·카메라 버튼 42px는 토큰에 없어 기본 scale(h-39.5 w-38.5 size-10.5) 적용
      'bg-surface-secondary relative flex h-39.5 w-38.5 flex-col items-end justify-end rounded-full',
      className,
    )}
    {...props}
  >
    {src ? (
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 size-full rounded-full object-cover object-bottom"
      />
    ) : null}
    {onCameraClick ? (
      <button
        type="button"
        aria-label={cameraLabel}
        onClick={onCameraClick}
        className="bg-icon-tertiary focus-visible:outline-border-brand relative flex size-10.5 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <FillCameraLargeIcon className="text-icon-inversed" />
      </button>
    ) : null}
  </div>
);
