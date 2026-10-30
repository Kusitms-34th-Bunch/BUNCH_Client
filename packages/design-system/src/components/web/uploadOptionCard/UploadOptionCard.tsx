import { useId, type ComponentProps } from 'react';
import {
  FillCameraLargeIcon,
  FillPhotoLargeIcon,
  LineChevronRightMediumIcon,
} from '../../../icons';
import { cn } from '../../../utils';

export type UploadOptionCardProps = Omit<
  ComponentProps<'button'>,
  'type' | 'disabled' | 'children' | 'title' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
> & {
  title: string;
  description: string;
  /** 왼쪽 원 안 아이콘. 기본값 `photo`(앨범), `camera`는 카메라로 찍기 */
  icon?: 'photo' | 'camera' | undefined;
};

const icons = { photo: FillPhotoLargeIcon, camera: FillCameraLargeIcon };

/**
 * 사진 올리기 방식 하나를 보여 주고 눌러서 고르는 카드(Figma `UploadOptionCard`)
 * 눌렀을 때의 동작과 글자는 호출하는 쪽 담당, 눌림은 카드와 원에 각각 배경 층 겹침 처리
 */
export const UploadOptionCard = ({
  title,
  description,
  icon = 'photo',
  className,
  ...props
}: UploadOptionCardProps) => {
  const id = useId();
  const Icon = icons[icon];

  return (
    <button
      {...props}
      type="button"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      className={cn(
        // Figma 높이 82px은 토큰에 없어 기본 scale 20.5 적용
        'group/option bg-surface-secondary px-s7 gap-s5 rounded-r4 relative isolate flex min-h-20.5 w-full cursor-pointer touch-manipulation items-center text-left',
        'before:rounded-r4 before:bg-overlay-hover before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out active:before:opacity-100 motion-reduce:before:transition-none',
        'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
    >
      <span className="bg-surface-primary p-s5 before:bg-overlay-hover relative isolate flex shrink-0 rounded-full before:absolute before:inset-0 before:-z-10 before:rounded-full before:opacity-0 before:transition-opacity before:duration-75 before:ease-out group-active/option:before:opacity-100 motion-reduce:before:transition-none">
        <Icon className="text-icon-primary" />
      </span>
      <span className="gap-s1 flex min-w-0 flex-1 flex-col wrap-break-word break-keep">
        <span id={`${id}-title`} className="typography-body-1-medium text-text-primary">
          {title}
        </span>
        <span id={`${id}-description`} className="typography-body-4-regular text-text-tertiary">
          {description}
        </span>
      </span>
      <LineChevronRightMediumIcon className="text-icon-quaternary shrink-0" />
    </button>
  );
};
