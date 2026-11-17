'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useBundleEditContext } from '../../contexts/bundleEditContext';
import { markPhotoAddEntry } from '../../lib/photoAddEntry';
import { BundleEditError } from './BundleEditError';
import { BundleEditScreen } from './BundleEditScreen';

type BundleEditProps = {
  /** 저장해 번들이 바뀐 뒤(피드·번들 상세 캐시를 맞추는 호출 지점, 이 feature 밖이라 route가 연결) */
  onSaved?: (() => void) | undefined;
  /** 사진 추가 시트의 「내 갤러리에서 가져오기」(사진함 상태가 필요해 route가 연결, 더 담을 수 있는 장수와 함께) */
  onImportFromGallery: (_maxCount: number) => void;
};

/**
 * `/bunches/[bunchId]/bundles/[bundleId]/edit` 번들 수정 화면: layout의 `BundleEditProvider`가 든 편집 상태를 화면에 연결
 * 메인 관리자가 아니면 안내 뒤, 없는 번들이거나 발행 전이면 안내 없이 상세·작성 화면으로 돌려보냄
 * 저장하면 상세로 돌아가 「번들을 수정했어요」를 알리고, 저장하는 동안은 로딩이 화면을 덮음
 */
export function BundleEdit({ onSaved, onImportFromGallery }: BundleEditProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { bunchId, bundleId, state, actions } = useBundleEditContext();
  const detailPath = BUNDLE_PATHS.publishedDetail(bunchId, bundleId);
  const kind = state.kind;

  // 이 화면에서 볼 수 없는 번들이면 알맞은 화면으로(상세는 삭제된 번들이면 스스로 안내함)
  useEffect(() => {
    if (kind === 'forbidden') {
      toastAfterNavigation(BUNDLE_MESSAGES.editPermissionChanged);
      router.replace(detailPath);
    } else if (kind === 'missing') router.replace(detailPath);
    else if (kind === 'draft') router.replace(BUNDLE_PATHS.draft(bundleId));
  }, [kind, router, detailPath, bundleId]);

  if (state.kind === 'error')
    return <BundleEditError onRetry={state.retry} onBack={() => backOr(detailPath)} />;
  if (state.kind !== 'ready') return <PageLoading />;

  // 저장 결과에 따라 안내하고 이동: 성공이면 상세로, 권한을 잃었거나 사라졌으면 상세가 새로 받아 그 상태를 보임
  const save = async () => {
    const outcome = await actions.save();
    if (outcome === 'saved') {
      onSaved?.();
      toastAfterNavigation(BUNDLE_MESSAGES.editSaved);
      router.replace(detailPath);
    } else if (outcome === 'forbidden') {
      toastAfterNavigation(BUNDLE_MESSAGES.editPermissionChanged);
      onSaved?.();
      router.replace(detailPath);
    } else if (outcome === 'missing') {
      onSaved?.();
      router.replace(detailPath);
    } else if (outcome === 'conflict' || outcome === 'failed')
      toast(BUNDLE_MESSAGES.editSaveFailed);
  };

  return (
    <>
      {/* 저장하는 동안 로딩이 화면을 덮고, 아래 화면은 키보드로도 닿지 않게 하며 낭독으로 알림 */}
      <p role="status" className="sr-only">
        {state.saving ? BUNDLE_MESSAGES.editSaving : ''}
      </p>
      {state.saving ? <PageLoading /> : null}
      <div inert={state.saving} className="contents">
        <BundleEditScreen
          draft={state.draft}
          viewer={state.viewer}
          actions={actions}
          dirty={state.dirty}
          canSave={state.canSave}
          onLeave={() => backOr(detailPath)}
          onSave={() => void save()}
          onOpenPhoto={(photoId) =>
            router.push(BUNDLE_PATHS.editPhotoViewer(bunchId, bundleId, photoId))
          }
          onImportFromBunchBox={() => {
            markPhotoAddEntry();
            router.push(BUNDLE_PATHS.editPhotoAdd(bunchId, bundleId));
          }}
          onImportFromGallery={onImportFromGallery}
        />
      </div>
    </>
  );
}
