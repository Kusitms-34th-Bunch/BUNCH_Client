'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { BUNDLE_PATHS } from '../constants/paths';
import { useDraft } from '../hooks/useDraft';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { DraftScreen } from './DraftScreen';

type BundleDraftProps = {
  /** route에서 형식을 검증한 초안 id. 형식이 틀렸으면 undefined */
  draftId: string | undefined;
};

/**
 * `/bunch/drafts/[draftId]` 번들 작성 화면: 초안 데이터와 동작을 가져와 화면에 연결
 * 없는 초안(삭제됨·발행됨·잘못된 id)은 「삭제된 번들이에요」 토스트 뒤 번치 홈으로 이동
 * 초안 API 연결 전에는 fixture와 목 동작이고, 연결하면 이 호출 지점만 바꿈
 */
export function BundleDraft({ draftId }: BundleDraftProps) {
  const router = useRouter();
  const { state, actions } = useDraft(draftId);
  const { online, recheck } = useOnlineStatus();
  const missing = state.kind === 'missing';

  useEffect(() => {
    if (!missing) return;
    toast(BUNDLE_MESSAGES.deletedDraft, { fullWidth: true });
    router.replace(BUNDLE_PATHS.bunchHome);
  }, [missing, router]);

  if (state.kind !== 'ready') return <PageLoading />;

  return (
    <DraftScreen
      draft={state.draft}
      viewer={state.viewer}
      saveStatus={state.saveStatus}
      offline={!online}
      actions={actions}
      // 직접 주소로 들어와 돌아갈 기록이 없으면 번치 홈으로 이동(뒤로가기는 묻지 않음, 기능 spec 4.3.1)
      onBack={() =>
        window.history.length > 1 ? router.back() : router.replace(BUNDLE_PATHS.bunchHome)
      }
      onLeave={() => router.replace(BUNDLE_PATHS.bunchHome)}
      onRetry={recheck}
    />
  );
}
