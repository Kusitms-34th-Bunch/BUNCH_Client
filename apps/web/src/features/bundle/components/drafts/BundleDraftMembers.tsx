'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LATE_OVERLAY_MS,
  PAGE_LOADING_LABEL,
  PageLoading,
} from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useLeaveDraft } from '../../hooks/useDraftExit';
import { isDraftCreator } from '../../lib/permissions';
import { BundleLoadError } from '../BundleLoadError';
import { DraftMemberManager } from './DraftMemberManager';

/**
 * `/bunch/drafts/[draftId]/members` 참여 멤버 관리 화면: layout의 초안 상태를 작성 화면과 함께 봄
 * 더하거나 뺀 내용은 바로 반영되어 뒤로가기로 작성 화면에 돌아오면 참여 멤버 카드에 나타남
 */
export function BundleDraftMembers() {
  const backOr = useBackOr();
  const { state, actions } = useDraftContext();
  const leaveDraft = useLeaveDraft(state.kind === 'ready' ? state.draft.id : undefined);
  // 들어올 때마다 번치 멤버를 서버에서 새로 받음(DraftMemberManager.spec.md). 받는 동안과 실패해도 받아 둔 목록을 그대로 보임
  const { data: profile } = useQuery(myProfileQueryOptions());
  useQuery({ ...bunchMembersQueryOptions(profile?.bunch?.id), refetchOnMount: 'always' });

  if (state.kind === 'error') return <BundleLoadError onRetry={state.retry} />;
  if (state.kind !== 'ready')
    return <PageLoading delayMs={LATE_OVERLAY_MS} label={PAGE_LOADING_LABEL} />;

  return (
    <DraftMemberManager
      draft={state.draft}
      viewer={state.viewer}
      bunchMembers={state.bunchMembers}
      actions={actions}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동
      onBack={() => backOr(BUNDLE_PATHS.draft(state.draft.id))}
      onLeave={() => void leaveDraft(isDraftCreator(state.draft, state.viewer))}
    />
  );
}
