'use client';

import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useRedirectMissingDraft } from '../../hooks/useDraftExit';
import { DraftPick } from './DraftPick';

/**
 * `/bunch/drafts/[draftId]/pick` 픽하기 화면: layout의 초안 상태를 작성 화면과 함께 봄
 * 직접 주소로 들어와 돌아갈 기록이 없으면 뒤로가기는 작성 화면으로 이동
 */
export function BundleDraftPick() {
  const backOr = useBackOr();
  const { state, actions } = useDraftContext();

  useRedirectMissingDraft(state.kind === 'missing');

  if (state.kind !== 'ready') return <PageLoading />;

  const { draft, viewer } = state;
  return (
    <DraftPick
      draft={draft}
      viewer={viewer}
      actions={actions}
      onBack={() => backOr(BUNDLE_PATHS.draft(draft.id))}
    />
  );
}
