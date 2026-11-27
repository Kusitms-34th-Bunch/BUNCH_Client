'use client';

import { cn } from '@app/design-system';
import { PhotoThumbnail } from '@app/design-system/web';
import Link from 'next/link';
import { memo, useState } from 'react';
import type { PhotoBoxPhoto } from '../lib/types';
import { PHOTO_BOX_PATHS, photoHeroKey } from '../constants/paths';
import { usePhotoOrder, usePhotoSelectionActions } from '../contexts/photoSelection';
import { PHOTO_ID_ATTRIBUTE } from '../lib/dragSelect';

type PhotoCellProps = {
  photo: PhotoBoxPhoto;
};

/**
 * 사진 한 칸(123px 정사각형). 처리 중이거나 불러오지 못한 사진은 회색 자리표시로 표시
 * 선택 모드에서는 눌러서 고르는 버튼이 되고 고른 순서를 번호로 보임(자리표시는 고를 수 없음), 그 밖에서는 사진 상세 링크
 */
export const PhotoCell = memo(function PhotoCell({ photo }: PhotoCellProps) {
  // 실패한 주소만 기억(서명 주소가 만료돼 실패해도 새 주소를 받으면 다시 그림, #587)
  const [brokenSrc, setBrokenSrc] = useState<string>();
  const broken = brokenSrc === photo.src;
  const { active, onToggle } = usePhotoSelectionActions();
  // 자기 번호만 구독해 다른 사진을 골라도 다시 그려지지 않음(사진이 많은 화면에서 한 장을 누를 때마다 전체가 다시 그려져 다음 터치가 밀리던 문제 방지)
  const order = usePhotoOrder(photo.id);

  if (photo.status !== 'ready' || broken) {
    const label = photo.status === 'processing' ? '처리 중인 사진' : '불러오지 못한 사진';
    return (
      <div role="img" aria-label={label} className="bg-surface-tertiary aspect-square w-full" />
    );
  }

  // 선택 모드를 켜고 꺼도 같은 틀·사진을 유지해 사진을 다시 그리지 않음(깜빡임 방지)
  // 평소에는 사진 위에 상세 링크를 덮고(이름은 링크, 사진은 장식), 선택 모드에서는 PhotoThumbnail이 고르는 버튼을 덮음
  return (
    // 선택 모드에서는 세로 스크롤만 브라우저에 맡기고 가로 움직임은 쓸어서 고르기가 받음
    // 상세에서 돌아오는 hero 사진(SSGOI가 이 칸에 붙이는 복사본)이 뒤 칸에 가리지 않게 그동안만 위로 올림
    <div
      {...{ [PHOTO_ID_ATTRIBUTE]: photo.id }}
      className={cn(
        'relative isolate has-[>[data-ssgoi-crossfade]]:z-1',
        active && 'touch-pan-y touch-pinch-zoom',
      )}
    >
      {/* 상세로 들어가는 hero는 출발 사진을 투명하게 해 칸이 흰 구멍으로 보여, 나가는 화면(data-page-leaving)에서만 같은 사진을 뒤에 보임(#587)
          보이는 순간 같은 프레임에 그리게 decoding sync(CSS 배경은 첫 디코딩에 몇 프레임 비었음). 돌아올 때는 착지할 칸과 겹치지 않게 숨김
          썸네일과 같은 서명 주소를 그대로 써 next/image 최적화 대상이 아님 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt=""
        aria-hidden="true"
        // 썸네일처럼 화면 근처에서만 받음(같은 주소라 캐시를 탐)
        loading="lazy"
        decoding="sync"
        className="invisible absolute inset-0 -z-10 size-full object-cover in-data-page-leaving:visible"
      />
      <PhotoThumbnail
        src={photo.src}
        alt={active ? photo.alt : ''}
        className="w-full"
        selectionMode={active}
        selected={order !== undefined}
        selectionOrder={order}
        onClick={active ? () => onToggle(photo.id) : undefined}
        onImageError={() => setBrokenSrc(photo.src)}
        // 상세의 같은 사진으로 이어지는 hero 출발점(선택 모드에서는 상세로 가지 않음)
        {...(active ? {} : { 'data-hero-enter-key': photoHeroKey(photo.id) })}
      />
      {active ? null : (
        <Link
          href={PHOTO_BOX_PATHS.detail(photo.id)}
          prefetch={false}
          aria-label={photo.alt}
          className="focus-visible:outline-border-brand absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
        />
      )}
    </div>
  );
});
