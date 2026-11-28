'use client';

import { BundleEditPhotoViewer } from '@/features/bundle/components';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';

type BundleEditPhotoViewerRouteProps = {
  /** 형식을 검증한 사진 id. 형식이 틀렸으면 undefined */
  photoId: string | undefined;
};

/** 수정 중 사진 크게 보기: 배지와 헤더 날짜에 쓰는 사진함 원본 정보는 route에서 이어 줌(feature끼리 직접 잇지 않음) */
export function BundleEditPhotoViewerRoute({ photoId }: BundleEditPhotoViewerRouteProps) {
  const { state } = usePhotoBox();
  const data = state.kind === 'ready' ? state.data : undefined;
  const sources = data
    ? new Map(
        data.photos.map((photo) => [
          photo.id,
          {
            takenAt: photo.takenAt,
            uploaderIds: photo.uploaderIds,
            aspectRatio: photo.aspectRatio,
          },
        ]),
      )
    : undefined;
  // 사진함 데이터는 보조 정보라 기다리지 않고 화면을 먼저 보임
  return (
    <BundleEditPhotoViewer
      photoId={photoId}
      sources={sources}
      sourcesPending={state.kind === 'loading'}
      bunchMembers={data?.members}
    />
  );
}
