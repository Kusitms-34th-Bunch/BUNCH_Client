'use client';

import { useRouter } from 'next/navigation';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useLeaveDraft, useRedirectMissingDraft } from '../../hooks/useDraftExit';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { isDraftCreator } from '../../lib/permissions';
import { DraftScreen } from './DraftScreen';

/**
 * `/bunch/drafts/[draftId]` 번들 작성 화면: layout의 `DraftProvider`가 든 초안 상태와 동작을 화면에 연결
 * 없는 초안(삭제됨·발행됨·잘못된 id)은 「삭제된 번들이에요」 토스트 뒤 번치 홈으로 이동
 * 초안 API 연결 전에는 fixture와 목 동작이고, 연결하면 `useDraft`만 바꿈
 */
export function BundleDraft() {
  const router = useRouter();
  const backOr = useBackOr();
  const { state, actions } = useDraftContext();
  const { online, recheck } = useOnlineStatus();
  const leaveDraft = useLeaveDraft();
  const draftId = state.kind === 'ready' ? state.draft.id : undefined;

  useRedirectMissingDraft(state.kind === 'missing');

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
      onLeave={() => leaveDraft(isDraftCreator(state.draft, state.viewer))}
      onRetry={recheck}
      onAddMember={() => router.push(BUNDLE_PATHS.members(draftId))}
      onOpenPhoto={(photoId) => router.push(BUNDLE_PATHS.photo(draftId, photoId))}
    />
  );
}
