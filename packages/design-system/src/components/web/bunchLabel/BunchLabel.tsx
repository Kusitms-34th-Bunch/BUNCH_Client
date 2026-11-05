import type { ComponentProps } from 'react';
import { LineChevronRightMediumIcon } from '../../../icons';
import { cn } from '../../../utils';
import { ProfileImage } from '../profileImage';

export type BunchLabelProps = Omit<ComponentProps<'button'>, 'children' | 'type'> & {
  /** 번치 이름(접근성 이름). 길면 한 줄 말줄임 */
  name: string;
  /** 번치 대표 이미지. 없으면 기본 프로필 배경 */
  imageSrc?: string | undefined;
};

/**
 * 테두리 있는 번치 한 줄(Figma `Bunch_Label` `3534:65660`): 34px 이미지·이름·오른쪽 화살표
 * 기본·눌림(overlay-hover 10%)·비활성(surface-disabled, 40%). 눌렀을 때의 이동은 호출자 담당
 */
export const BunchLabel = ({ name, imageSrc, className, ...props }: BunchLabelProps) => (
  <button
    type="button"
    {...props}
    className={cn(
      // 테두리는 Figma처럼 안쪽 선(크기에 포함되지 않음, 높이 54)
      'inset-ring-border-tertiary bg-surface-primary rounded-r4 px-padding-p4 py-padding-p5 gap-s4 relative flex w-full cursor-pointer touch-manipulation items-center justify-between text-left inset-ring',
      // 눌림: 이미지·바탕 위로 overlay-hover를 덮음(Figma Pressed)
      'before:rounded-r4 before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
      'enabled:active:before:opacity-100',
      'disabled:bg-surface-disabled disabled:inset-ring-border-disabled disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
      // 고대비 모드는 box-shadow(inset-ring)를 그리지 않아 같은 자리에 1px 선을 따로 그림
      'forced-colors:outline forced-colors:outline-1 forced-colors:-outline-offset-1 forced-colors:disabled:outline-[GrayText]',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
  >
    <span className="gap-s3 flex min-w-0 items-center">
      <ProfileImage src={imageSrc} size="XS" className="border-border-tertiary shrink-0 border" />
      <span className="typography-body-2-medium text-text-secondary min-w-0 truncate">{name}</span>
    </span>
    <LineChevronRightMediumIcon className="text-icon-quaternary shrink-0" />
  </button>
);
