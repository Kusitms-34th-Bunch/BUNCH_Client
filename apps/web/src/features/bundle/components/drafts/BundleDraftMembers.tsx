'use client';

import { useRouter } from 'next/navigation';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useLeaveDraft, useRedirectMissingDraft } from '../../hooks/useDraftExit';
import { isDraftCreator } from '../../lib/permissions';
import { DraftMemberManager } from './DraftMemberManager';

/**
 * `/bunch/drafts/[draftId]/members` 참여 멤버 관리 화면: layout의 초안 상태를 작성 화면과 함께 봄
 * 더하거나 뺀 내용은 바로 반영되어 뒤로가기로 작성 화면에 돌아오면 참여 멤버 카드에 나타남
 */
export function BundleDraftMembers() {
  const router = useRouter();
  const { state, actions } = useDraftContext();
  const leaveDraft = useLeaveDraft();

  useRedirectMissingDraft(state.kind === 'missing');

  if (state.kind !== 'ready') return <PageLoading />;

  return (
    <DraftMemberManager
      draft={state.draft}
      viewer={state.viewer}
      bunchMembers={state.bunchMembers}
      actions={actions}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동
      onBack={() =>
        window.history.length > 1
          ? router.back()
          : router.replace(BUNDLE_PATHS.draft(state.draft.id))
      }
      onLeave={() => leaveDraft(isDraftCreator(state.draft, state.viewer))}
    />
  );
}
