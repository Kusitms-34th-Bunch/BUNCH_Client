'use client';

import { ApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { replaceUrl } from '@/shared/lib/replaceUrl';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { PHOTO_BOX_PATHS } from '../../constants/paths';
import { usePhotoBox } from '../../hooks/usePhotoBox';
import { getDetailOrder } from '../../lib/photoDetail';
import { photoDetailQueryOptions } from '../../queries/photoDetail';
import { useInvalidatePhotos } from '../../queries/photos';
import { PhotoDetailScreen } from './PhotoDetailScreen';

// 같은 결과면 같은 Map을 돌려주도록 모듈 상수 함수로 둠(렌더마다 새 Map이 생기지 않게)
const toOriginalSrcMap = (
  results: readonly { data?: { id: string; imageSrc: string } | undefined }[],
) =>
  new Map(
    results.flatMap((result) => (result.data ? [[result.data.id, result.data.imageSrc]] : [])),
  );

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
    combine: toOriginalSrcMap,
  });
  // 목록에는 있는데 보는 사진의 상세가 없다고 오면 다른 곳에서 막 지운 사진(RESOURCE_001)
  const currentDetail = useQuery(
    photoDetailQueryOptions(currentIndex < 0 ? undefined : data?.bunch.id, currentId ?? ''),
  );
  const goneOnServer =
    currentDetail.error instanceof ApiError && currentDetail.error.code === 'RESOURCE_001';
  const invalidatePhotos = useInvalidatePhotos(data?.bunch.id);
  const photosWithOriginal = useMemo(
    () => photos.map((photo) => ({ ...photo, src: originals.get(photo.id) ?? photo.src })),
    [photos, originals],
  );
  // 화면에 들어온 뒤 삭제로 사진이 사라진 것은 없는 사진 안내 대상이 아니라 화면의 이탈 흐름이 처리
  const [entered, setEntered] = useState(false);
  if (data !== undefined && present && !entered) setEntered(true);
  const missing = data !== undefined && !present && !entered;
  // 들어온 뒤 다른 곳에서 지워져 지금 보는 사진이 목록에서 사라진 경우(내가 삭제하는 동안은 삭제 흐름이 처리)
  const deleting = useRef(false);
  const vanished = entered && data !== undefined && currentIndex < 0;
  // 오류·번치 없음은 상세에서 보여 줄 화면이 없어 사진함으로 보냄(사진함이 오류 화면과 다시 시도를 가짐)
  const unavailable = state.kind === 'error' || state.kind === 'no-bunch';

  useEffect(() => {
    if (unavailable) router.replace(PHOTO_BOX_PATHS.list);
  }, [unavailable, router]);

  useEffect(() => {
    if (!goneOnServer) return;
    toast(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
    void invalidatePhotos();
    router.replace(PHOTO_BOX_PATHS.list);
  }, [goneOnServer, invalidatePhotos, router]);

  useEffect(() => {
    if (!vanished || deleting.current) return;
    toast(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
    router.replace(PHOTO_BOX_PATHS.list);
  }, [vanished, router]);

  useEffect(() => {
    if (!missing) return;
    toast(PHOTO_BOX_MESSAGES.deletedPhoto, { fullWidth: true });
    router.replace(PHOTO_BOX_PATHS.list);
  }, [missing, router]);

  // 삭제로 사진이 사라진 직후에는 마지막 화면을 유지해 로딩으로 바뀌는 깜빡임 없이 이탈 흐름(토스트·이동)이 이어지게 함
  const [lastPhotos, setLastPhotos] = useState(photosWithOriginal);
  if (present && lastPhotos !== photosWithOriginal) setLastPhotos(photosWithOriginal);

  // 내가 사진을 지우는 동안에는 목록에서 사라져도 별도 안내 없이 화면의 이탈 흐름(토스트·이동)에 맡김
  const guardedActions = {
    ...actions,
    deletePhotos: async (ids: readonly string[]) => {
      deleting.current = true;
      try {
        return await actions.deletePhotos(ids);
      } finally {
        deleting.current = false;
      }
    },
  };

  if (!data || photoId === undefined || (!present && !entered)) return <PageLoading />;

  return (
    <PhotoDetailScreen
      photos={present ? photosWithOriginal : lastPhotos}
      members={data.members}
      viewer={data.viewer}
      initialPhotoId={photoId}
      actions={guardedActions}
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
