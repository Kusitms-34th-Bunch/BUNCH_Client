'use client';

import { toast } from '@app/design-system';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useDraftPicks } from '../../hooks/useDraftPicks';
import { getDraftAccess } from '../../lib/permissions';
import { DraftPickScreen } from './DraftPickScreen';

/**
 * `/bunch/drafts/[draftId]/pick` 대표 사진 투표 화면: layout의 초안 상태를 작성 화면과 함께 봄
 * 픽한 내용은 서버 모델이 정해지기 전까지 이 탭의 메모리에만 있음(`useDraftPicks`)
 */
export function BundleDraftPick() {
  const backOr = useBackOr();
  const { state } = useDraftContext();
  const draft = state.kind === 'ready' ? state.draft : undefined;
  const viewer = state.kind === 'ready' ? state.viewer : undefined;
  const { picks, toggle } = useDraftPicks(draft?.id, viewer?.memberId);

  if (!draft || !viewer) return <PageLoading />;

  return (
    <DraftPickScreen
      photos={draft.photos}
      members={draft.members}
      viewerId={viewer.memberId}
      picks={picks}
      editable={getDraftAccess(draft, viewer).canEdit}
      onToggle={toggle}
      onDenied={() => toast(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true })}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동
      onBack={() => backOr(BUNDLE_PATHS.draft(draft.id))}
    />
  );
}
