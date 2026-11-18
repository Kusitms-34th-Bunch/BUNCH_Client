'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { PhotoBoxError } from '@/features/photo-box/components/PhotoBoxError';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useDraftContext } from '../../contexts/draftContext';
import { useLeaveDraft } from '../../hooks/useDraftExit';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { isDraftCreator } from '../../lib/permissions';
import { markPhotoAddEntry } from '../../lib/photoAddEntry';
import { DraftScreen } from './DraftScreen';

type BundleDraftProps = {
  /** 사진 추가 시트의 「내 갤러리에서 가져오기」(사진함 상태가 필요해 route가 연결, 더 담을 수 있는 장수와 함께) */
  onImportFromGallery: (_maxCount: number) => void;
  /** 갤러리에서 가져오는 중이면 고른 장수(칸 로딩과 사진 작업 중 표시에 씀) */
  galleryImporting?: number | undefined;
};

/**
 * `/bunch/drafts/[draftId]` 번들 작성 화면: layout의 `DraftProvider`가 든 초안 상태와 동작을 화면에 연결
 * 없는 초안(삭제됨·발행됨·잘못된 id)은 「삭제된 번들이에요」 토스트 뒤 번치 홈으로 이동
 */
export function BundleDraft({ onImportFromGallery, galleryImporting }: BundleDraftProps) {
  const router = useRouter();
  const backOr = useBackOr();
  // 공개 범위 화면으로 넘어가 그려질 때까지 페이지 로딩을 보임
  const [moving, startMoving] = useTransition();
  const { state, actions } = useDraftContext();
  const { online, recheck } = useOnlineStatus();
  const draftId = state.kind === 'ready' ? state.draft.id : undefined;
  const leaveDraft = useLeaveDraft(draftId);

  if (state.kind === 'error') return <PhotoBoxError onRetry={state.retry} />;
  if (state.kind !== 'ready' || draftId === undefined) return <PageLoading />;

  return (
    <>
      {/* 이동하는 동안 로딩이 화면을 덮고, 아래 화면은 키보드로도 닿지 않게 하며 낭독으로 알림 */}
      <p role="status" className="sr-only">
        {moving ? BUNDLE_MESSAGES.moving : ''}
      </p>
      {moving ? <PageLoading /> : null}
      <div inert={moving} className="contents">
        <DraftScreen
          draft={state.draft}
          viewer={state.viewer}
          saveStatus={state.saveStatus}
          // 제목 문서를 불러오지 못한 것도 연결 문제처럼 배너와 「재시도」로 알림(기능 spec 4.3.14)
          offline={!online || state.realtime.down || state.titleFailed}
          titleReady={state.titleReady}
          actions={actions}
          // 번치 홈에서 만든 초안이면(`from=home`) 거쳐 온 멤버·사진 선택이 아니라 번치 홈으로 이동
          // 그 밖에는 들어온 곳으로 가고, 직접 주소로 들어와 돌아갈 기록이 없으면 번치 홈으로 이동(뒤로가기는 묻지 않음, 기능 spec 4.3.1)
          onBack={() =>
            new URLSearchParams(window.location.search).get('from') === 'home'
              ? router.replace(BUNDLE_PATHS.bunchHome)
              : backOr(BUNDLE_PATHS.bunchHome)
          }
          onLeave={() => void leaveDraft(isDraftCreator(state.draft, state.viewer))}
          // 「재시도」는 브라우저 연결 상태를 다시 읽고 끊긴 실시간 연결과 불러오지 못한 제목 문서도 기다리지 않고 다시 시도
          onRetry={() => {
            recheck();
            state.realtime.retry();
            state.retryTitle();
          }}
          // 조건을 채우면 공개 범위 화면으로 가서 거기서 업로드(기능 spec 4.3.12)
          onUpload={() => startMoving(() => router.push(BUNDLE_PATHS.visibility(draftId)))}
          onAddMember={() => router.push(BUNDLE_PATHS.members(draftId))}
          onOpenPhoto={(photoId) => router.push(BUNDLE_PATHS.photoViewer(draftId, photoId))}
          onOpenPick={() => router.push(BUNDLE_PATHS.pick(draftId))}
          onImportFromBunchBox={() => {
            markPhotoAddEntry();
            router.push(BUNDLE_PATHS.photoAdd(draftId));
          }}
          onImportFromGallery={onImportFromGallery}
          galleryImporting={galleryImporting}
        />
      </div>
    </>
  );
}
