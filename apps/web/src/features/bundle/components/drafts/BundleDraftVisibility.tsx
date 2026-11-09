'use client';

import { ConfirmDialog } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PhotoBoxError } from '@/features/photo-box/components/PhotoBoxError';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import type { DraftVisibility } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { getDraftAccess } from '../../lib/permissions';
import { getPublishBlockers } from '../../lib/publish';
import { DraftVisibilityScreen } from './DraftVisibilityScreen';

type BundleDraftVisibilityProps = {
  /** 내 번치가 비공개인지(route가 번치 홈 데이터로 알려 줌, 모르면 공개로 봄) */
  bunchPrivate?: boolean | undefined;
};

/**
 * `/bunch/drafts/[draftId]/visibility` 업로드 직전 공개 범위 화면: layout의 초안 상태를 작성 화면과 함께 봄
 * 공개 범위를 고르고 「업로드」하면 발행하고 번치 홈으로 이동(기능 spec 4.3.12)
 * 직접 주소로 들어왔는데 업로드 조건을 못 채웠거나 권한이 없으면 작성 화면으로 돌려보냄
 */
export function BundleDraftVisibility({ bunchPrivate = false }: BundleDraftVisibilityProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { state, actions } = useDraftContext();
  const [uploading, setUploading] = useState(false);
  // 업로드가 끝나면 로딩을 걷고 「업로드가 완료되었어요」 창을 띄움(확인하면 번치 홈으로 이동)
  const [done, setDone] = useState(false);
  // 업로드하는 동안 초안이 사라져도 공개 범위 화면을 그대로 보이도록 업로드 시점의 선택을 보관
  const [frozen, setFrozen] = useState<DraftVisibility | null>(null);
  // 같은 틱에 연달아 눌러도 한 번만 보내도록 ref로 막음(state 갱신 전에는 uploading이 아직 false)
  const submitted = useRef(false);

  const draft = state.kind === 'ready' ? state.draft : undefined;
  const viewer = state.kind === 'ready' ? state.viewer : undefined;
  // 저장 중·연결 같은 일시 상태가 아니라 내용 조건(제목·사진·멤버·코멘트)과 권한만 봄
  const contentReady =
    draft !== undefined &&
    viewer !== undefined &&
    getDraftAccess(draft, viewer).canPublish &&
    getPublishBlockers(draft, { saveStatus: 'saved', offline: false }).every(
      (blocker) => blocker === 'visibility',
    );
  // 업로드 중에는 발행으로 초안 상태가 바뀌어도 작성 화면으로 돌려보내지 않음
  const notReady = state.kind === 'ready' && !contentReady && !uploading && !done;
  const draftId = draft?.id;

  useEffect(() => {
    if (notReady && draftId !== undefined) router.replace(BUNDLE_PATHS.draft(draftId));
  }, [notReady, draftId, router]);

  if (state.kind === 'error') return <PhotoBoxError onRetry={state.retry} />;
  const busy = uploading || done;
  // 업로드 중·완료 창이 떠 있는 동안은 초안이 사라져도 이 화면을 유지
  if (!busy && (state.kind !== 'ready' || !draft || notReady)) return <PageLoading />;

  const upload = () => {
    if (!draft || submitted.current || draft.visibility === null) return;
    submitted.current = true;
    setFrozen(draft.visibility);
    setUploading(true);
    void actions.publish().then((outcome) => {
      if (outcome === 'published') {
        setUploading(false);
        setDone(true);
        return;
      }
      // 실패하면 다시 시도할 수 있게 풂(성공은 이동이 끝날 때까지 유지)
      submitted.current = false;
      setUploading(false);
      setFrozen(null);
    });
  };

  return (
    <>
      <DraftVisibilityScreen
        value={busy ? frozen : (draft?.visibility ?? null)}
        bunchPrivate={bunchPrivate}
        uploading={uploading}
        onChange={actions.setVisibility}
        // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동
        onBack={() => backOr(BUNDLE_PATHS.draft(draft?.id ?? ''))}
        onUpload={upload}
      />
      {/* 확인해야 번치 홈으로 이동(창 밖을 눌러도 닫히지 않음) */}
      <ConfirmDialog
        open={done}
        onOpenChange={() => undefined}
        appearance="text"
        title={BUNDLE_MESSAGES.published}
        confirmLabel={BUNDLE_MESSAGES.missingDraftConfirm}
        onConfirm={() => router.replace(BUNDLE_PATHS.bunchHome)}
      />
    </>
  );
}
