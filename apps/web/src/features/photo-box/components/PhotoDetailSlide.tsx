'use client';

import { cn } from '@app/design-system';
import { UploaderBadge } from '@app/design-system/web';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import type { PhotoBoxMember, PhotoBoxPhoto } from '../lib/types';
import { photoHeroKey } from '../constants/paths';
import { getUploaders } from '../lib/photoDetail';
import { getPhotoRatio, rememberPhotoRatio } from '../lib/photoRatio';

type PhotoDetailSlideProps = {
  photo: PhotoBoxPhoto;
  members: readonly PhotoBoxMember[];
  /** 헤더와 같이 숨겨지는 올린 멤버 배지의 숨김 여부 */
  chromeHidden: boolean;
  /** 지금 보는 사진 여부. 이 사진만 사진함 썸네일과 hero로 이어짐(옆 사진까지 이으면 함께 날아감) */
  current: boolean;
};

// 들어오는 화면 전환(나가는 화면 표식)이 끝나길 기다리는 최대 시간
const TRANSITION_WAIT_MS = 1000;

/**
 * 슬라이드 한 장: 원본 비율의 큰 사진과 오른쪽 위 올린 멤버 배지(함께 올린 사진은 세로로 여러 개)
 * Swiper Zoom이 `swiper-zoom-target`을 확대하므로 사진과 배지를 한 덩어리로 묶음
 * 처리 중이거나 불러오지 못한 사진은 회색 정사각형 자리표시
 * 틀 높이는 보이는 이미지 비율을 따름. 썸네일 뒤 원본 주소가 오면 같은 img의 주소를 바꾸지 않고(디코딩 전 빈 칸이 깜빡임)
 * 원본을 숨긴 img로 받아 둔 뒤 그 img를 썸네일 위로 페이드인하고, 그때 높이도 원본 비율로 늘림(미리 받은 원본이면 처음부터 원본 비율)
 */
export function PhotoDetailSlide({ photo, members, chromeHidden, current }: PhotoDetailSlideProps) {
  const reducedMotion = useReducedMotion();
  // 불러오지 못한 주소를 쌓아 둠(하나만 두면 썸네일·원본이 모두 실패할 때 서로 덮어 다시 받기를 반복)
  const [brokenSrcs, setBrokenSrcs] = useState<readonly string[]>([]);
  const uploaders = getUploaders(photo, members);
  // 보이는 이미지 주소. 새 주소는 다 받은 뒤 바꾸고, 그동안 이전 이미지를 그대로 둠
  const [shownSrc, setShownSrc] = useState(photo.src);
  // 새 이미지가 페이드인하는 동안 아래에 남겨 둘 이전 이미지
  const [underSrc, setUnderSrc] = useState<string | null>(null);
  // 받은 비율을 다시 그리게 하는 값(비율은 photoRatio가 주소별로 기억)
  const [, setRatioVersion] = useState(0);
  // 숨겨 받던 새 이미지 중 다 받은 주소. 전환이 끝나면 보이는 이미지로 바꿈
  const [readySrc, setReadySrc] = useState<string | null>(null);

  const shownBroken = brokenSrcs.includes(shownSrc);
  // 페이드 중 아래 이전 이미지와 같은 주소로 돌아오면 새로 받지 않음(같은 key 중복)
  const pendingSrc =
    shownSrc === photo.src || photo.src === underSrc || brokenSrcs.includes(photo.src)
      ? null
      : photo.src;
  // 숨겨 받는 주소가 바뀌면 이전에 다 받은 기록을 버림(새 노드는 아직 받기 전)
  const [readyFor, setReadyFor] = useState(pendingSrc);
  if (readyFor !== pendingSrc) {
    setReadyFor(pendingSrc);
    setReadySrc(null);
  }
  const showPlaceholder = photo.status !== 'ready' || (shownBroken && pendingSrc === null);
  const ratio = getPhotoRatio(shownSrc);
  const remember = (image: HTMLImageElement, src: string) => {
    rememberPhotoRatio(src, image.naturalWidth, image.naturalHeight);
    setRatioVersion((version) => version + 1);
  };
  // 들어오는 hero가 날아가는 동안 바꾸면 새로 보이는 층이 날아가는 사본과 겹치므로 전환(나가는 화면 표식)이 끝난 뒤 바꿈
  useEffect(() => {
    if (readySrc === null || readySrc !== pendingSrc) return;
    const startedAt = performance.now();
    let frame = 0;
    const swap = () => {
      if (
        document.querySelector('[data-page-leaving]') !== null &&
        performance.now() - startedAt < TRANSITION_WAIT_MS
      ) {
        frame = requestAnimationFrame(swap);
        return;
      }
      setUnderSrc(reducedMotion || shownBroken ? null : shownSrc);
      setShownSrc(readySrc);
      setReadySrc(null);
    };
    frame = requestAnimationFrame(swap);
    return () => cancelAnimationFrame(frame);
  }, [readySrc, pendingSrc, reducedMotion, shownBroken, shownSrc]);
  // 아래 이전 이미지, 보이는 이미지, 숨겨 받는 새 이미지를 주소 key 하나의 목록으로 그려 바뀔 때 DOM을 그대로 옮김(새로 만들면 다시 디코딩)
  const layers = [
    underSrc === null ? null : { src: underSrc, role: 'under' as const },
    shownBroken ? null : { src: shownSrc, role: 'shown' as const },
    pendingSrc === null ? null : { src: pendingSrc, role: 'pending' as const },
  ].filter((layer) => layer !== null);
  // 사진함 썸네일과 이어지는 hero 짝은 불투명한 층 하나에만(페이드 중에는 아래 이전 이미지)
  const heroRole = underSrc === null ? 'shown' : 'under';

  return (
    // 높이를 슬라이드 폭 기준(cqw)으로 계산해 transition이 길이끼리 이어지게 함
    <div className="swiper-zoom-container @container">
      <div
        className="swiper-zoom-target relative w-full overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1)] motion-reduce:transition-none"
        // 비율을 모르는 동안은 정사각형(썸네일 모양) 높이를 잡아 원본이 오면 숫자 높이끼리 전환
        style={showPlaceholder ? undefined : { height: `calc(100cqw / ${ratio ?? 1})` }}
      >
        {showPlaceholder || shownBroken ? (
          <div
            role="img"
            aria-label={photo.status === 'processing' ? '처리 중인 사진' : '불러오지 못한 사진'}
            className="bg-surface-tertiary aspect-square w-full"
          />
        ) : null}
        {photo.status === 'ready' &&
          layers.map(({ src, role }) => (
            // 업로드한 사진은 크기·출처가 제각각이고 Swiper Zoom이 원본 요소를 확대해 next/image 최적화 제외
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={role === 'shown' ? photo.alt : ''}
              aria-hidden={role === 'shown' ? undefined : true}
              data-hero-exit-key={current && role === heroRole ? photoHeroKey(photo.id) : undefined}
              className={cn(
                'size-full object-cover',
                role === 'shown' ? 'relative block' : 'absolute inset-0',
                role === 'pending' && 'pointer-events-none opacity-0',
                role === 'shown' &&
                  underSrc !== null &&
                  'animate-[page-content-in_200ms_ease-out] motion-reduce:animate-none',
              )}
              draggable={false}
              onLoad={(event) => {
                if (role === 'pending') {
                  rememberPhotoRatio(
                    src,
                    event.currentTarget.naturalWidth,
                    event.currentTarget.naturalHeight,
                  );
                  setReadySrc(src);
                } else if (role === 'shown') remember(event.currentTarget, src);
              }}
              onAnimationEnd={role === 'shown' ? () => setUnderSrc(null) : undefined}
              // 원본만 실패하면 보이던 썸네일을 그대로 두고, 보이던 이미지가 실패하면 자리표시(다른 주소를 받는 중이면 그대로 받음)
              onError={() => {
                if (role !== 'under')
                  setBrokenSrcs((list) => (list.includes(src) ? list : [...list, src]));
              }}
            />
          ))}
        {uploaders.length > 0 ? (
          <div
            className={cn(
              'top-s6 right-s8 gap-s4 absolute flex flex-col items-end',
              // 한 번 누르거나 확대하면 서서히 숨김(Figma 사진 상세: 200ms, 0, 0, 0.35, 1)
              'transition-opacity duration-200 ease-[cubic-bezier(0,0,0.35,1)] motion-reduce:transition-none',
              chromeHidden ? 'opacity-0' : 'opacity-100',
            )}
          >
            {uploaders.map((member) => (
              <UploaderBadge key={member.id} name={member.name} avatarSrc={member.avatarSrc} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
