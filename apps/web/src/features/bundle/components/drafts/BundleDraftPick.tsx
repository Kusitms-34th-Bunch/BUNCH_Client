'use client';

import { toast } from '@app/design-system';
import { useState } from 'react';
import {
  LATE_OVERLAY_MS,
  PAGE_LOADING_LABEL,
  PageLoading,
} from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useDraftPicks } from '../../hooks/useDraftPicks';
import { getDraftAccess } from '../../lib/permissions';
import { withOwnPicks } from '../../lib/picks';
import { DraftPickScreen } from './DraftPickScreen';

/**
 * `/bunch/drafts/[draftId]/pick` 대표 사진 투표 화면: layout의 초안 상태를 작성 화면과 함께 봄
 * 픽은 서버에 저장하고(`useDraftPicks`), 들어올 때 최신 상세를 받은 뒤에는 사진 목록·순서와 다른 멤버의 픽을 그 시점 값으로 고정함
 * 다른 멤버가 바꾼 내용은 다시 들어올 때 반영하고(기능 spec 4.3.5 로직 3·6), 내 픽만 바로 바뀜
 */
export function BundleDraftPick() {
  const backOr = useBackOr();
  const { state } = useDraftContext();
  const draft = state.kind === 'ready' ? state.draft : undefined;
  const viewer = state.kind === 'ready' ? state.viewer : undefined;
  // 누른 사진이 서버에 없다고 확인된 경우(404): 바로 삭제 안내를 띄움
  const [goneId, setGoneId] = useState<string | undefined>(undefined);
  const { picks, toggle, entry } = useDraftPicks(
    draft,
    viewer?.memberId,
    // 브라우저 오프라인은 빠짐(그 순간 누르면 요청 뒤 실패 안내, 명세 4.3.14와 다름). 판정 차이는 DraftScreen.spec.md
    state.kind === 'ready' && state.realtime.down,
    setGoneId,
  );

  // 들어올 때 받은 최신 상세(`entry`)가 오면 그 값으로 고정(그 전에는 지금 값을 보임)
  const frozen = entry;
  // 안내의 「확인」을 눌러 목록에서 없앤 사진
  const [dismissed, setDismissed] = useState<readonly string[]>([]);

  const shown = frozen ?? (draft ? { photos: draft.photos, picks: draft.picks } : undefined);
  const photos = shown?.photos.filter((photo) => !dismissed.includes(photo.id)) ?? [];
  // 들어온 뒤 번들에서 빠졌지만 아직 보이는 사진
  const removedIds = new Set(
    frozen && draft
      ? frozen.photos
          .filter((photo) => !draft.photos.some((current) => current.id === photo.id))
          .map((photo) => photo.id)
      : [],
  );

  if (!draft || !viewer || !shown)
    return <PageLoading delayMs={LATE_OVERLAY_MS} label={PAGE_LOADING_LABEL} />;

  return (
    <DraftPickScreen
      photos={photos}
      members={draft.members}
      viewerId={viewer.memberId}
      picks={frozen ? withOwnPicks(frozen.picks, picks, viewer.memberId) : picks}
      editable={getDraftAccess(draft, viewer).canEdit}
      onToggle={toggle}
      onDenied={() => toast(BUNDLE_MESSAGES.editOnlyParticipants)}
      removedIds={removedIds}
      deletedNoticeFor={goneId}
      onDismissRemoved={(photoId) => {
        setDismissed((current) => [...current, photoId]);
        setGoneId(undefined);
      }}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동
      onBack={() => backOr(BUNDLE_PATHS.draft(draft.id))}
    />
  );
}
