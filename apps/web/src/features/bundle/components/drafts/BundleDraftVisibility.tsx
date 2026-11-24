'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LATE_OVERLAY_MS,
  PAGE_LOADING_LABEL,
  PageLoading,
} from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import type { DraftVisibility } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { getDraftAccess } from '../../lib/permissions';
import { getPublishBlockers } from '../../lib/publish';
import { BundleLoadError } from '../BundleLoadError';
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
  const notReady = state.kind === 'ready' && !contentReady && !uploading;
  const draftId = draft?.id;

  // 브라우저·OS 뒤로 가기처럼 화면 안의 뒤로 가기 버튼을 거치지 않고 떠나도 고른 공개 범위를 버림(기능 spec 4.3.9)
  const setVisibilityRef = useRef(actions.setVisibility);
  useEffect(() => {
    setVisibilityRef.current = actions.setVisibility;
  });
  useEffect(() => () => setVisibilityRef.current(null), []);

  useEffect(() => {
    if (notReady && draftId !== undefined) router.replace(BUNDLE_PATHS.draft(draftId));
  }, [notReady, draftId, router]);

  if (state.kind === 'error') return <BundleLoadError onRetry={state.retry} />;
  // 업로드 중에는 초안이 사라져도 이 화면(과 로딩)을 유지
  if (!uploading && (state.kind !== 'ready' || !draft || notReady))
    return <PageLoading delayMs={LATE_OVERLAY_MS} label={PAGE_LOADING_LABEL} />;

  const upload = () => {
    if (!draft || submitted.current || draft.visibility === null) return;
    submitted.current = true;
    setFrozen(draft.visibility);
    setUploading(true);
    void actions.publish().then((outcome) => {
      if (outcome === 'published') {
        toastAfterNavigation(BUNDLE_MESSAGES.published);
        router.replace(BUNDLE_PATHS.bunchHome);
        return;
      }
      // 실패하면 다시 시도할 수 있게 풂(성공은 이동이 끝날 때까지 유지)
      submitted.current = false;
      setUploading(false);
      setFrozen(null);
    });
  };

  return (
    <DraftVisibilityScreen
      value={uploading ? frozen : (draft?.visibility ?? null)}
      bunchPrivate={bunchPrivate}
      uploading={uploading}
      onChange={actions.setVisibility}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 작성 화면으로 이동
      onBack={() => {
        // 업로드 중에는 초안이 사라져 돌아갈 곳을 만들 수 없음
        if (draftId === undefined || uploading) return;
        // 뒤로 가면 고른 공개 범위를 버림(기능 spec 4.3.9)
        actions.setVisibility(null);
        backOr(BUNDLE_PATHS.draft(draftId));
      }}
      onUpload={upload}
    />
  );
}
