'use client';

import { useState, type ComponentProps } from 'react';
import { cn } from '../../../utils';
import { BundleInfo, type BundleInfoProps } from '../bundleInfo';
import { PageCounter } from '../pageCounter';
import { ProfileImage } from '../profileImage';

export type BundlePhotoItem = { src: string; alt?: string | undefined };

export type BundlePhotoProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 사진 목록(순서대로 좌우로 넘김) */
  photos: BundlePhotoItem[];
  /** thumbnail: 피드 카드(첫 사진 위에 어두운 배경과 제목·위치·날짜) · detail: 상세(사진만) */
  variant?: 'thumbnail' | 'detail' | undefined;
  /** thumbnail 첫 사진 위의 제목·위치·날짜 */
  info?:
    | Pick<BundleInfoProps, 'title' | 'location' | 'onLocationClick' | 'date' | 'titleAs'>
    | undefined;
  /** thumbnail 첫 사진 위쪽의 번치(이미지·이름·경과 시간). 누르면 번치 프로필 */
  author?:
    { name: string; imageSrc?: string | undefined; time: string; onClick: () => void } | undefined;
  /** 사진을 눌렀을 때(피드 카드 → 번들 상세). 넘긴 사진 순번(0부터)을 받음 */
  onPhotoClick?: ((_index: number) => void) | undefined;
  /** 보이는 사진이 바뀔 때(상세의 캡션 전환). 0부터 */
  onIndexChange?: ((_index: number) => void) | undefined;
  /** 사진 버튼의 접근성 이름. 기본값 「번들 사진 N/전체 열기」 */
  photoLabel?: ((_index: number, _total: number) => string) | undefined;
};

// Figma `Bundle Photo Card` 그라데이션(토큰 없음, 디자인 값 유지)
const BOTTOM_SCRIM =
  'linear-gradient(to top, rgba(0,0,0,0.6) 16.499%, rgba(0,0,0,0.4) 54.139%, rgba(0,0,0,0.08) 90.299%, rgba(0,0,0,0) 98.68%)';
const TOP_SCRIM = 'linear-gradient(to bottom, rgba(0,0,0,0.3) 25.55%, rgba(0,0,0,0) 98.116%)';

/**
 * 번들 사진(Figma `Bundle Photo Card`·`Bundle Photo`): 4:5 사진을 좌우로 넘기고 오른쪽 아래에 「현재/전체」
 * thumbnail은 둥근 카드이고 첫 사진(`Type=Info`)에 번치·제목·위치·날짜를 얹으며 그때는 순번을 숨김. 사진이 1장이어도 숨김
 */
export const BundlePhoto = ({
  photos,
  variant = 'thumbnail',
  info,
  author,
  onPhotoClick,
  onIndexChange,
  photoLabel = (index, total) => `번들 사진 ${index + 1}/${total} 열기`,
  className,
  ...props
}: BundlePhotoProps) => {
  const [current, setCurrent] = useState(0);
  const thumbnail = variant === 'thumbnail';
  const total = photos.length;
  const cover = thumbnail && (info || author);

  const handleScroll = (element: HTMLDivElement) => {
    const index = Math.round(element.scrollLeft / element.clientWidth);
    if (index === current || index < 0 || index >= total) return;
    setCurrent(index);
    onIndexChange?.(index);
  };

  return (
    <div className={cn('relative w-full', className)} {...props}>
      <div
        onScroll={(event) => handleScroll(event.currentTarget)}
        // 사진 버튼이 없으면 목록 자체에 초점을 줘 방향키로 넘김
        tabIndex={onPhotoClick ? undefined : 0}
        aria-label={onPhotoClick ? undefined : '번들 사진'}
        role={onPhotoClick ? undefined : 'group'}
        className={cn(
          'focus-visible:outline-border-brand flex snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:-outline-offset-2',
          thumbnail && 'rounded-r10',
        )}
      >
        {photos.map((photo, index) => (
          <div
            key={`${photo.src}-${index}`}
            className="relative aspect-4/5 w-full shrink-0 snap-center snap-always overflow-hidden"
          >
            <img
              src={photo.src}
              alt={photo.alt ?? ''}
              decoding="async"
              loading={index === 0 ? undefined : 'lazy'}
              className="absolute inset-0 size-full object-cover"
            />
            {cover && index === 0 && author ? (
              // 화면 순서대로 사진 버튼보다 먼저 초점이 오게 앞에 둠. 그라데이션 위로 z-10
              <div className="pt-padding-p8 px-padding-p8 pointer-events-none absolute inset-x-0 top-0 z-10 flex">
                <button
                  type="button"
                  onClick={author.onClick}
                  className="gap-s4 focus-visible:outline-border-inversed rounded-r2 pointer-events-auto flex min-w-0 cursor-pointer touch-manipulation items-center text-left focus-visible:outline-2"
                >
                  <ProfileImage
                    size="XS"
                    src={author.imageSrc}
                    alt=""
                    className="outline-border-tertiary outline -outline-offset-1"
                  />
                  <span className="text-text-inversed flex min-w-0 flex-col">
                    <span className="typography-body-2-semi-bold -mb-0.5 truncate">
                      {author.name}
                    </span>
                    <span className="typography-caption-1-regular flex h-4.5 items-center">
                      {author.time}
                    </span>
                  </span>
                </button>
              </div>
            ) : null}
            {onPhotoClick ? (
              <button
                type="button"
                aria-label={photoLabel(index, total)}
                onClick={() => onPhotoClick(index)}
                className="focus-visible:outline-border-brand absolute inset-0 cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:-outline-offset-2"
              />
            ) : null}
            {cover && index === 0 ? (
              <>
                <div
                  aria-hidden="true"
                  className="bg-overlay-dim-subtle pointer-events-none absolute inset-0"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-25"
                  style={{ backgroundImage: TOP_SCRIM }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-31"
                  style={{ backgroundImage: BOTTOM_SCRIM }}
                />
                {info ? (
                  <BundleInfo
                    {...info}
                    variant="overlay"
                    className="px-padding-p8 pb-padding-p8 pointer-events-none absolute inset-x-0 bottom-0 [&_button]:pointer-events-auto"
                  />
                ) : null}
              </>
            ) : null}
          </div>
        ))}
      </div>
      {total > 1 && !(thumbnail && current === 0) ? (
        <PageCounter
          current={current + 1}
          total={total}
          className="right-padding-p8 bottom-padding-p8 pointer-events-none absolute"
        />
      ) : null}
    </div>
  );
};
