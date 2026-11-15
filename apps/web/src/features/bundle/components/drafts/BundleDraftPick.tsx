'use client';

import { toast } from '@app/design-system';
import { useMemo, useState } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import type { DraftPhoto } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useDraftPicks } from '../../hooks/useDraftPicks';
import { getDraftAccess } from '../../lib/permissions';
import { withOwnPicks, type Picks } from '../../lib/picks';
import { DraftPickScreen } from './DraftPickScreen';

type Snapshot = { photos: readonly DraftPhoto[]; picks: Picks };

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
  const { picks, toggle, synced } = useDraftPicks(
    draft,
    viewer?.memberId,
    state.kind === 'ready' && state.realtime.down,
  );

  // 들어올 때 받은 최신 상세가 오면 그 값으로 고정(그 전에는 지금 값을 보임)
  const [frozen, setFrozen] = useState<Snapshot | undefined>(undefined);
  if (synced && !frozen && draft) setFrozen({ photos: draft.photos, picks: draft.picks });
  // 안내의 「확인」을 눌러 목록에서 없앤 사진
  const [dismissed, setDismissed] = useState<readonly string[]>([]);

  const shown = frozen ?? (draft ? { photos: draft.photos, picks: draft.picks } : undefined);
  const photos = useMemo(
    () => shown?.photos.filter((photo) => !dismissed.includes(photo.id)) ?? [],
    [shown?.photos, dismissed],
  );
  // 들어온 뒤 번들에서 빠졌지만 아직 보이는 사진
  const removedIds = useMemo(
    () =>
      new Set(
        frozen && draft
          ? frozen.photos
              .filter((photo) => !draft.photos.some((current) => current.id === photo.id))
              .map((photo) => photo.id)
          : [],
      ),
    [frozen, draft],
  );

  if (!draft || !viewer || !shown) return <PageLoading />;

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
      onDismissRemoved={(photoId) => setDismissed((current) => [...current, photoId])}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동
      onBack={() => backOr(BUNDLE_PATHS.draft(draft.id))}
    />
  );
}
