import type { ComponentProps } from 'react';
import { LineAddMediumIcon, LineAddSmallIcon } from '../../../icons';
import { cn } from '../../../utils';

const SIZES = { xs: 'w-32.5', s: 'w-75', m: 'w-82.5' } as const;

export type AddBundlePhotoEditorSize = keyof typeof SIZES;

export type AddBundlePhotoEditorProps = Omit<ComponentProps<'button'>, 'children' | 'disabled'> & {
  /** 정사각 크기: `xs` 130px(작성 화면 사진 목록, 반경 4px·더하기 원 26px·글자 13px), `s` 300px, `m` 330px(기본), 폭 변경은 `className` 덮어쓰기 */
  size?: AddBundlePhotoEditorSize | undefined;
  /** 카드의 글자(기본 "사진 추가") */
  label?: string | undefined;
};

/**
 * 번들 사진 추가 타일(Figma `Bundle Photo Editor`, `Type=Add`): `surface-secondary` 정사각 타일에 흰 더하기 원과 글자
 * 사진을 추가하는 동작은 `onClick`으로 호출하는 쪽이 정하며 `className`은 타일에 적용
 */
export const AddBundlePhotoEditor = ({
  type = 'button',
  size = 'm',
  label = '사진 추가',
  className,
  ...props
}: AddBundlePhotoEditorProps) => {
  const small = size === 'xs';

  return (
    <button
      type={type}
      className={cn(
        'bg-surface-secondary flex aspect-square shrink-0 cursor-pointer touch-manipulation flex-col items-center justify-center',
        small ? 'rounded-r2 gap-s3' : 'rounded-r4 gap-s4',
        SIZES[size],
        'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'bg-surface-primary text-icon-primary flex items-center justify-center rounded-full',
          small ? 'size-6.5' : 'size-9',
        )}
      >
        {small ? <LineAddSmallIcon /> : <LineAddMediumIcon />}
      </span>
      <span
        className={
          small
            ? 'typography-body-4-regular text-text-tertiary'
            : 'typography-body-3-regular text-text-primary'
        }
      >
        {label}
      </span>
    </button>
  );
};
