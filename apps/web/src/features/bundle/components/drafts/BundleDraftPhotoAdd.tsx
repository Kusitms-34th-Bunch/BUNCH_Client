'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NoBunch } from '@/features/photo-box/components/NoBunch';
import { PhotoBoxError } from '@/features/photo-box/components/PhotoBoxError';
import { usePhotoBoxFixture } from '@/features/photo-box/hooks/usePhotoBoxFixture';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useRedirectMissingDraft } from '../../hooks/useDraftExit';
import { getDraftAccess } from '../../lib/permissions';
import { clearPhotoAddEntry, isPhotoAddEntry } from '../../lib/photoAddEntry';
import { DraftPhotoAdd } from './DraftPhotoAdd';

/**
 * `/bunch/drafts/[draftId]/photos/add` 사진 추가 화면: layout의 초안 상태와 사진함 목록을 함께 봄
 * 참여 멤버만 편집할 수 있어 아니면 안내 토스트 뒤 작성 화면으로 돌려보냄(주소로 직접 들어온 경우)
 */
export function BundleDraftPhotoAdd() {
  const router = useRouter();
  const { state, actions } = useDraftContext();
  const { state: photoState } = usePhotoBoxFixture();
  // 캡션 화면에서 앱 안으로 들어왔을 때만 이전 기록(캡션 화면)으로 돌아감. 직접 주소·새로고침이면 기록을 믿지 않음
  const [fromCaption] = useState(isPhotoAddEntry);
  useEffect(() => clearPhotoAddEntry, []);

  const readyDraft = state.kind === 'ready' ? state.draft : undefined;
  const canEdit = state.kind === 'ready' && getDraftAccess(state.draft, state.viewer).canEdit;
  const draftId = readyDraft?.id;

  useRedirectMissingDraft(state.kind === 'missing');
  useEffect(() => {
    if (draftId === undefined || canEdit) return;
    toast(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true });
    router.replace(BUNDLE_PATHS.draft(draftId));
  }, [draftId, canEdit, router]);

  if (state.kind !== 'ready' || !canEdit || photoState.kind === 'loading') return <PageLoading />;
  if (photoState.kind === 'error') return <PhotoBoxError />;
  if (photoState.kind === 'no-bunch') {
    return (
      <PageShell>
        <h1 className="sr-only">{BUNDLE_MESSAGES.photoAddTitle}</h1>
        <NoBunch />
      </PageShell>
    );
  }

  const { draft, viewer } = state;
  // 앱 안에서 온 게 아니면 첫 사진의 캡션 화면으로 이동(적용으로 사진이 모두 바뀌어도 첫 장은 있음)
  const firstPhotoId = draft.photos[0]?.id;
  const goBack = () =>
    fromCaption && window.history.length > 1
      ? router.back()
      : router.replace(
          firstPhotoId ? BUNDLE_PATHS.photo(draft.id, firstPhotoId) : BUNDLE_PATHS.draft(draft.id),
        );
  return (
    <DraftPhotoAdd
      draft={draft}
      viewer={viewer}
      data={photoState.data}
      actions={actions}
      onBack={goBack}
      onApplied={goBack}
    />
  );
}
