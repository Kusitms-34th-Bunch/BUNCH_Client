import type { ComponentProps } from 'react';
import { LineCloseSmallIcon } from '../../../icons';
import { cn } from '../../../utils';
import { ProfileImage } from '../profileImage';

const SIZES = { s: 'w-75', m: 'w-82.5' } as const;

export type BundlePhotoSize = keyof typeof SIZES;

export type BundlePhotoUploader = {
  /** 올린 멤버 이름(아바타의 대체 텍스트) */
  name: string;
  /** 프로필 이미지 주소(없으면 배경색 원) */
  src?: string | undefined;
};

export type BundlePhotoProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 사진 주소 */
  src: string;
  /** 사진 설명(꾸미는 사진이면 빈 문자열) */
  alt: string;
  /** 정사각 크기: `s` 300px, `m` 330px(기본), 폭 변경은 `className` 덮어쓰기 */
  size?: BundlePhotoSize | undefined;
  /** 사진을 올린 멤버(Figma `avater`): 주면 왼쪽 위에 31px 아바타가 얹힘 */
  uploader?: BundlePhotoUploader | undefined;
  /** 아바타를 읽어 주는 글자(기본 "{이름}님이 올린 사진"), 사진 설명 바로 뒤에서 이름만 읽히면 올린 사람인지 알 수 없어서 */
  uploaderLabel?: string | undefined;
  /** 오른쪽 위 삭제 버튼을 눌렀을 때(주면 삭제 버튼이 나타남) */
  onDelete?: (() => void) | undefined;
  /** 삭제 버튼의 접근성 이름(기본 "사진 삭제") */
  deleteLabel?: string | undefined;
};

/**
 * 번들 사진(Figma `Bundle Photo`, `Type=Photo`): 반경 `r4`의 정사각 사진
 * 올린 멤버 아바타(왼쪽 위)와 삭제 버튼(오른쪽 위)을 사진 위에 얹을 수 있고 `className`은 사진 틀에 적용
 */
export const BundlePhoto = ({
  src,
  alt,
  size = 'm',
  uploader,
  uploaderLabel,
  onDelete,
  deleteLabel = '사진 삭제',
  className,
  ...props
}: BundlePhotoProps) => (
  <div
    className={cn(
      'rounded-r4 relative aspect-square shrink-0 overflow-hidden',
      SIZES[size],
      className,
    )}
    {...props}
  >
    <img src={src} alt={alt} decoding="async" className="absolute inset-0 size-full object-cover" />
    {(uploader !== undefined || onDelete !== undefined) && (
      <div className="p-s8 absolute inset-x-0 top-0 flex items-center">
        {uploader !== undefined && (
          <>
            <ProfileImage
              src={uploader.src}
              alt={uploaderLabel ?? `${uploader.name}님이 올린 사진`}
              className="border-border-tertiary size-7.75 border"
            />
            {/* 사진이 없으면 ProfileImage가 img를 그리지 않아 이름이 사라지므로 글자로 대신 전달 */}
            {!uploader.src && (
              <span className="sr-only">{uploaderLabel ?? `${uploader.name}님이 올린 사진`}</span>
            )}
          </>
        )}
        {onDelete !== undefined && (
          <button
            type="button"
            aria-label={deleteLabel}
            onClick={onDelete}
            className={cn(
              'bg-overlay-scrim text-icon-inversed relative ml-auto flex size-6 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full backdrop-blur-[15px]',
              // 보이는 24px보다 넓은 32px 터치 영역(design-system-icons.md의 Small 기준)
              "before:absolute before:-inset-1 before:content-['']",
              'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
            )}
          >
            <LineCloseSmallIcon aria-hidden="true" />
          </button>
        )}
      </div>
    )}
  </div>
);
