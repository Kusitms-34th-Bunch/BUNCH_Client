'use client';

import { useRouter } from 'next/navigation';
import { PhotoBoxError } from '@/features/photo-box/components/PhotoBoxError';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useLeaveDraft } from '../../hooks/useDraftExit';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePhotoGalleryImport } from '../../hooks/usePhotoGalleryImport';
import { isDraftCreator } from '../../lib/permissions';
import { markPhotoAddEntry } from '../../lib/photoAddEntry';
import { DraftScreen } from './DraftScreen';

/**
 * `/bunch/drafts/[draftId]` 번들 작성 화면: layout의 `DraftProvider`가 든 초안 상태와 동작을 화면에 연결
 * 없는 초안(삭제됨·발행됨·잘못된 id)은 「삭제된 번들이에요」 토스트 뒤 번치 홈으로 이동
 */
export function BundleDraft() {
  const router = useRouter();
  const backOr = useBackOr();
  const { state, actions } = useDraftContext();
  const { online, recheck } = useOnlineStatus();
  const draftId = state.kind === 'ready' ? state.draft.id : undefined;
  const leaveDraft = useLeaveDraft(draftId);
  const { state: boxState } = usePhotoBox();
  const importFromGallery = usePhotoGalleryImport(
    boxState.kind === 'ready' ? boxState.data.photos.length : 0,
  );

  if (state.kind === 'error') return <PhotoBoxError onRetry={state.retry} />;
  if (state.kind !== 'ready' || draftId === undefined) return <PageLoading />;

  return (
    <DraftScreen
      draft={state.draft}
      viewer={state.viewer}
      saveStatus={state.saveStatus}
      offline={!online}
      actions={actions}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 번치 홈으로 이동(뒤로가기는 묻지 않음, 기능 spec 4.3.1)
      onBack={() => backOr(BUNDLE_PATHS.bunchHome)}
      onLeave={() => void leaveDraft(isDraftCreator(state.draft, state.viewer))}
      onRetry={recheck}
      // 조건을 채우면 공개 범위 화면으로 가서 거기서 업로드(기능 spec 4.3.12)
      onUpload={() => router.push(BUNDLE_PATHS.visibility(draftId))}
      onAddMember={() => router.push(BUNDLE_PATHS.members(draftId))}
      onOpenPhoto={(photoId) => router.push(BUNDLE_PATHS.photo(draftId, photoId))}
      onOpenPick={() => router.push(BUNDLE_PATHS.pick(draftId))}
      onImportFromBunchBox={() => {
        markPhotoAddEntry();
        router.push(BUNDLE_PATHS.photoAdd(draftId));
      }}
      onImportFromGallery={importFromGallery}
    />
  );
}
