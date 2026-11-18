'use client';

import { useMemo } from 'react';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useRedirectMissingPhoto } from '../../hooks/useDraftExit';
import { usePhotoAddress } from '../../hooks/usePhotoAddress';
import { DraftPhotoViewer } from './DraftPhotoViewer';

type BundleDraftPhotoViewerProps = {
  /** route에서 형식을 검증한 사진 id. 형식이 틀렸으면 undefined */
  photoId: string | undefined;
};

/**
 * `/bunch/drafts/[draftId]/photos/[photoId]/viewer` 사진 크게 보기: 작성 화면과 같은 초안 상태를 봄
 * 주소의 사진이 초안에 없으면 안내 토스트 뒤 작성 화면으로 돌아가고, 사진을 넘기면 주소가 따라 바뀜
 */
export function BundleDraftPhotoViewer({ photoId }: BundleDraftPhotoViewerProps) {
  const backOr = useBackOr();
  const { state, actions } = useDraftContext();
  const ready = state.kind === 'ready';
  const draftId = ready ? state.draft.id : undefined;
  const { initialPhotoId, sync } = usePhotoAddress(
    photoId,
    draftId,
    BUNDLE_PATHS.photoViewer,
    ready ? state.draft.photos.map((photo) => photo.id) : undefined,
  );
  // 배지와 헤더 날짜는 사진함 원본(올린 멤버·촬영 날짜)에서 가져옴. 사진함 목록을 이미 받았으면 캐시를 그대로 씀
  const { state: photoBox } = usePhotoBox();
  const photoBoxData = photoBox.kind === 'ready' ? photoBox.data : undefined;
  const sources = useMemo(
    () =>
      photoBoxData
        ? new Map(
            photoBoxData.photos.map((photo) => [
              photo.id,
              { takenAt: photo.takenAt, uploaderIds: photo.uploaderIds },
            ]),
          )
        : undefined,
    [photoBoxData],
  );
  // 사진함 데이터는 보조 정보라 기다리지 않고 화면을 먼저 보임(받는 동안 배지·날짜는 비워 둠)
  const sourcesPending = photoBox.kind === 'loading';
  const present = useRedirectMissingPhoto(ready ? state.draft : undefined, initialPhotoId);

  if (state.kind !== 'ready' || !present || initialPhotoId === undefined) return <PageLoading />;

  const { draft, viewer } = state;
  return (
    <DraftPhotoViewer
      draft={draft}
      viewer={viewer}
      actions={actions}
      initialPhotoId={initialPhotoId}
      sources={sources}
      sourcesPending={sourcesPending}
      bunchMembers={photoBoxData?.members}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동(작성 화면에서 사진을 눌러 들어오는 화면)
      onBack={() => backOr(BUNDLE_PATHS.draft(draft.id))}
      onPhotoChange={sync}
    />
  );
}
