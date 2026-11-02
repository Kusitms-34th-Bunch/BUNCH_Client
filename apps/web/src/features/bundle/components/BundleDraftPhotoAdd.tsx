'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { NoBunch } from '@/features/photo-box/components/NoBunch';
import { PhotoBoxError } from '@/features/photo-box/components/PhotoBoxError';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { BUNDLE_PATHS } from '../constants/paths';
import { useDraftContext } from '../contexts/draftContext';
import { useRedirectMissingDraft } from '../hooks/useDraftExit';
import { getDraftAccess } from '../lib/permissions';
import { DraftPhotoAdd } from './DraftPhotoAdd';

/**
 * `/bunch/drafts/[draftId]/photos/add` 사진 추가 화면: layout의 초안 상태와 사진함 목록을 함께 봄
 * 참여 멤버만 편집할 수 있어 아니면 안내 토스트 뒤 작성 화면으로 돌려보냄(주소로 직접 들어온 경우)
 */
export function BundleDraftPhotoAdd() {
  const router = useRouter();
  const { state, actions } = useDraftContext();
  const { state: photoState } = usePhotoBox();

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
  // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동
  const goBack = () =>
    window.history.length > 1 ? router.back() : router.replace(BUNDLE_PATHS.draft(draft.id));
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
