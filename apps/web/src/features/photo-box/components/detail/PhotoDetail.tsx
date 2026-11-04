'use client';

import { toast } from '@app/design-system';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { replaceUrl } from '@/shared/lib/replaceUrl';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { PHOTO_BOX_PATHS } from '../../constants/paths';
import { usePhotoBox } from '../../hooks/usePhotoBox';
import { getDetailOrder } from '../../lib/photoDetail';
import { photoDetailQueryOptions } from '../../queries/photoDetail';
import { PhotoDetailScreen } from './PhotoDetailScreen';

type PhotoDetailProps = {
  /** route에서 형식을 검증한 사진 id. 형식이 틀렸으면 undefined */
  photoId: string | undefined;
};

/**
 * `/photos/[photoId]` 사진 상세: 사진 데이터와 동작을 가져와 화면에 연결
 * 없는 사진(삭제됨·잘못된 id)은 「삭제된 사진이에요」 토스트 뒤 사진함으로 이동
 */
export function PhotoDetail({ photoId }: PhotoDetailProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { state, actions } = usePhotoBox();
  const data = state.kind === 'ready' ? state.data : undefined;
  const photos = useMemo(
    () => (data ? getDetailOrder(data.photos, new Date().getFullYear()) : []),
    [data],
  );
  const present = photos.some((photo) => photo.id === photoId);
  // 지금 보는 사진과 양옆 사진의 원본만 받아 쓰고, 받기 전에는 목록의 썸네일을 그대로 보여 줌
  const [currentId, setCurrentId] = useState(photoId);
  const currentIndex = photos.findIndex((photo) => photo.id === currentId);
  const nearIds = photos.slice(Math.max(currentIndex - 1, 0), currentIndex + 2).map((p) => p.id);
  const originals = useQueries({
    queries: (currentIndex < 0 ? [] : nearIds).map((id) =>
      photoDetailQueryOptions(data?.bunch.id, id),
    ),
    combine: (results) =>
      new Map(
        results.flatMap((result) => (result.data ? [[result.data.id, result.data.imageSrc]] : [])),
      ),
  });
  const photosWithOriginal = useMemo(
    () => photos.map((photo) => ({ ...photo, src: originals.get(photo.id) ?? photo.src })),
    [photos, originals],
  );
  // 화면에 들어온 뒤 삭제로 사진이 사라진 것은 없는 사진 안내 대상이 아니라 화면의 이탈 흐름이 처리
  const [entered, setEntered] = useState(false);
  if (data !== undefined && present && !entered) setEntered(true);
  const missing = data !== undefined && !present && !entered;

  useEffect(() => {
    if (!missing) return;
    toast(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
    router.replace(PHOTO_BOX_PATHS.list);
  }, [missing, router]);

  if (!data || !present || photoId === undefined) return <PageLoading />;

  return (
    <PhotoDetailScreen
      photos={photosWithOriginal}
      members={data.members}
      viewer={data.viewer}
      initialPhotoId={photoId}
      actions={actions}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 사진함으로 이동
      onBack={() => backOr(PHOTO_BOX_PATHS.list)}
      onLeave={() => router.replace(PHOTO_BOX_PATHS.list)}
      // 넘길 때마다 Next 이동 없이 주소만 맞춰 새로고침·공유가 현재 사진을 가리키게 함
      onPhotoChange={(id) => {
        setCurrentId(id);
        replaceUrl(PHOTO_BOX_PATHS.detail(id));
      }}
    />
  );
}
