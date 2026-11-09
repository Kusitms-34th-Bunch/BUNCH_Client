'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { cn } from '../../../utils';
import { BundleInfo, type BundleInfoProps } from '../bundleInfo';
import { PageCounter } from '../pageCounter';
import { ProfileImage } from '../profileImage';
import pickMotion from './pickMotion.module.css';

export type BundlePhotoItem = {
  src: string;
  alt?: string | undefined;
  /** 이 사진을 pick한 멤버. 상세 사진 왼쪽 아래에 얼굴을 겹쳐 보이고(최대 3개) 누르면 전체를 펼침 */
  pickers?: { name: string; imageSrc?: string | undefined }[] | undefined;
};

export type BundlePhotoProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 사진 목록(순서대로 좌우로 넘김) */
  photos: BundlePhotoItem[];
  /** thumbnail: 피드 카드(첫 사진 위에 어두운 배경과 제목·위치·날짜) · detail: 상세(둥근 카드를 넘기고 옆 사진이 살짝 보임, 사진마다 순번·pick) */
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
  /** 사진 버튼의 접근성 이름. 기본값 「번들 사진 N/전체 열기」 */
  photoLabel?: ((_index: number, _total: number) => string) | undefined;
};

// Figma `Bundle Photo Card` 그라데이션(토큰 없음, 디자인 값 유지)
const BOTTOM_SCRIM =
  'linear-gradient(to top, rgba(0,0,0,0.6) 16.499%, rgba(0,0,0,0.4) 54.139%, rgba(0,0,0,0.08) 90.299%, rgba(0,0,0,0) 98.68%)';
const TOP_SCRIM = 'linear-gradient(to bottom, rgba(0,0,0,0.3) 25.55%, rgba(0,0,0,0) 98.116%)';

// 접힌 상태: 앞 사람일수록 진하고 오른쪽 위로 2px·1px씩 비껴 쌓임(Figma `PickAvatar`), 1~2명이면 그 수만큼
const PICK_LAYERS = [
  'left-0.75 top-0.5',
  'left-1.25 top-px opacity-80',
  'left-1.75 top-0 opacity-60',
];
const PICK_FACE = 'outline-border-tertiary outline -outline-offset-1';

/**
 * 사진을 pick한 멤버(Figma `PickAvatar`): 얼굴을 겹친 「pick」 버튼. 누르면 전체 멤버를 세로로 펼치고 다시 누르면 접힘
 * 많으면 사진 높이 안에서 스크롤. 이름은 버튼 이름으로 모두 읽으므로 펼친 목록은 낭독에서 숨김
 */
const PickAvatars = ({ pickers }: { pickers: NonNullable<BundlePhotoItem['pickers']> }) => {
  const [expanded, setExpanded] = useState(false);
  // 접히는 모션이 끝날 때까지 목록 유지
  const [closing, setClosing] = useState(false);
  // 떠다니는 모션은 얼굴이 보일 때 시작(가려진 채 끝나지 않게), 다시 보이면 또 재생
  // 움직이는 얼굴 대신 고정된 칸을 관찰(2px 움직임이 판정을 바꿔 재생이 반복되지 않게)
  const facesRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const float = visible ? pickMotion.float : undefined;
  const [first, ...rest] = pickers;
  const pressable = rest.length > 0;

  useEffect(() => {
    const faces = facesRef.current;
    if (!faces || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), {
      threshold: 0.5,
    });
    observer.observe(faces);
    return () => observer.disconnect();
    // 1명 ↔ 2명이면 칸이 다시 만들어짐
  }, [pressable]);
  const listed = expanded || closing;
  const stacked = listed ? pickers.slice(0, 1) : pickers.slice(0, PICK_LAYERS.length);
  const label = `pick ${pickers.map((picker) => picker.name).join(', ')}`;
  const badge = (
    <>
      <span ref={facesRef} className="relative -mb-2.5 block h-10.5">
        <span className={cn('block h-full', float)}>
          {stacked
            .map((picker, index) => (
              <ProfileImage
                key={`${picker.name}-${index}`}
                size="S"
                src={picker.imageSrc}
                alt=""
                className={cn(PICK_FACE, 'absolute', listed ? 'top-0 left-1' : PICK_LAYERS[index])}
              />
            ))
            .reverse()}
        </span>
      </span>
      <span className="bg-overlay-scrim px-s5 py-s1 typography-body-3-regular text-text-inversed relative rounded-full text-center backdrop-blur-[2px]">
        pick
      </span>
    </>
  );

  return (
    <div className="top-padding-p8 bottom-padding-p8 pointer-events-none absolute left-5 flex w-11.75 flex-col justify-end">
      {listed && first ? (
        <ul
          aria-hidden="true"
          tabIndex={-1}
          className="gap-s3 pb-s3 pointer-events-auto flex min-h-0 scrollbar-none flex-col-reverse items-center overflow-y-auto pt-0.5"
        >
          {rest.map((picker, index) => (
            <li
              key={`${picker.name}-${index}`}
              className={closing ? pickMotion.fall : pickMotion.rise}
              // 펼칠 때는 버튼 쪽부터, 접을 때는 위쪽부터. 버튼 옆 얼굴이 마지막에 끝남
              style={{ animationDelay: `${(closing ? rest.length - 1 - index : index) * 30}ms` }}
              onAnimationEnd={(event) => {
                if (index === 0 && event.target === event.currentTarget) setClosing(false);
              }}
            >
              <span
                className={cn('block', float)}
                style={{ animationDelay: `${-(index + 1) * 0.3}s` }}
              >
                <ProfileImage size="S" src={picker.imageSrc} alt="" className={PICK_FACE} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {pressable ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={label}
          onClick={() => {
            setClosing(expanded);
            setExpanded(!expanded);
          }}
          className="focus-visible:outline-border-inversed pointer-events-auto relative flex shrink-0 cursor-pointer touch-manipulation flex-col rounded-full focus-visible:outline-2"
        >
          {badge}
        </button>
      ) : (
        <div role="img" aria-label={label} className="relative flex shrink-0 flex-col">
          {badge}
        </div>
      )}
    </div>
  );
};

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
  };

  return (
    <div className={cn('relative w-full', className)} {...props}>
      <div
        onScroll={thumbnail ? (event) => handleScroll(event.currentTarget) : undefined}
        // 사진 버튼이 없으면 목록 자체에 초점을 줘 방향키로 넘김
        tabIndex={onPhotoClick ? undefined : 0}
        aria-label={onPhotoClick ? undefined : '번들 사진'}
        role={onPhotoClick ? undefined : 'group'}
        className={cn(
          'focus-visible:outline-border-brand flex snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:-outline-offset-2',
          // 상세는 카드 폭 = 화면 - 좌우 16, 카드 사이 8이라 옆 사진이 살짝 보임(Figma `5367:109055`)
          thumbnail ? 'rounded-r10' : 'gap-s4 px-padding-p8 scroll-px-padding-p8',
        )}
      >
        {photos.map((photo, index) => (
          <div
            key={`${photo.src}-${index}`}
            className={cn(
              'relative aspect-4/5 w-full shrink-0 snap-center snap-always overflow-hidden',
              !thumbnail && 'rounded-r10',
            )}
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
                    <span className="typography-body-2-semibold -mb-0.5 truncate">
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
            {!thumbnail && photo.pickers?.length ? <PickAvatars pickers={photo.pickers} /> : null}
            {!thumbnail && total > 1 ? (
              <PageCounter
                current={index + 1}
                total={total}
                className="right-padding-p8 bottom-padding-p8 pointer-events-none absolute"
              />
            ) : null}
          </div>
        ))}
      </div>
      {thumbnail && total > 1 && current !== 0 ? (
        <PageCounter
          current={current + 1}
          total={total}
          className="right-padding-p8 bottom-padding-p8 pointer-events-none absolute"
        />
      ) : null}
    </div>
  );
};
