import type { ComponentProps } from 'react';
import { LineAddMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

const SIZES = { s: 'w-75', m: 'w-82.5' } as const;

export type AddBundlePhotoSize = keyof typeof SIZES;

export type AddBundlePhotoProps = Omit<ComponentProps<'button'>, 'children' | 'disabled'> & {
  /** 정사각 크기: `s` 300px, `m` 330px(기본), 폭 변경은 `className` 덮어쓰기 */
  size?: AddBundlePhotoSize | undefined;
  /** 카드의 글자(기본 "사진 추가") */
  label?: string | undefined;
};

/**
 * 번들 사진 추가 타일(Figma `Bundle Photo`, `Type=Add`): `surface-secondary` 정사각 타일에 흰 더하기 원과 글자
 * 사진을 추가하는 동작은 `onClick`으로 호출하는 쪽이 정하며 `className`은 타일에 적용
 */
export const AddBundlePhoto = ({
  type = 'button',
  size = 'm',
  label = '사진 추가',
  className,
  ...props
}: AddBundlePhotoProps) => (
  <button
    type={type}
    className={cn(
      'bg-surface-secondary rounded-r4 gap-s4 flex aspect-square shrink-0 cursor-pointer touch-manipulation flex-col items-center justify-center',
      SIZES[size],
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
    {...props}
  >
    <span
      aria-hidden="true"
      className="bg-surface-primary text-icon-primary flex size-9 items-center justify-center rounded-full"
    >
      <LineAddMediumIcon />
    </span>
    <span className="typography-body-3-regular text-text-primary">{label}</span>
  </button>
);
