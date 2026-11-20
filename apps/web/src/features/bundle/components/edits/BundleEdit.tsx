'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import {
  LATE_OVERLAY_MS,
  PAGE_LOADING_LABEL,
  PageLoading,
} from '@/shared/components/loading/PageLoading';
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
  /** 갤러리에서 가져오는 중이면 고른 장수(칸 로딩과 사진 작업 중 표시에 씀) */
  galleryImporting?: number | undefined;
};

/**
 * `/bunches/[bunchId]/bundles/[bundleId]/edit` 번들 수정 화면: layout의 `BundleEditProvider`가 든 편집 상태를 화면에 연결
 * 메인 관리자가 아니면 안내 뒤, 없는 번들이거나 발행 전이면 안내 없이 상세·작성 화면으로 돌려보냄
 * 저장하면 상세로 돌아가 「번들을 수정했어요」를 알리고, 저장하는 동안은 로딩이 화면을 덮음
 */
export function BundleEdit({ onSaved, onImportFromGallery, galleryImporting }: BundleEditProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { bunchId, bundleId, state, actions } = useBundleEditContext();
  // 저장 거부 뒤 오류가 붙은 입력란을 찾는 범위
  const screenRef = useRef<HTMLDivElement>(null);
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
    return <BundleEditError onRetry={state.retry} onBack={() => router.replace(detailPath)} />;
  if (state.kind !== 'ready')
    return <PageLoading delayMs={LATE_OVERLAY_MS} label={PAGE_LOADING_LABEL} />;

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
    // 'prohibited'는 제목 입력란 아래에 안내하고 머묾(토스트 없음, 기능명세 6.2.12 예외)
    // 저장 중 화면이 잠겨 초점이 사라지므로, 잠금이 풀린 뒤 오류가 붙은 제목 입력란으로 옮겨 안내가 읽히고 바로 고칠 수 있게 함
    // 같은 제목으로 다시 거부돼도 초점을 옮기며 오류 설명이 다시 읽힘
    else if (outcome === 'prohibited')
      requestAnimationFrame(() =>
        screenRef.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus(),
      );
  };

  return (
    <>
      {/* 저장하는 동안 로딩이 화면을 덮고, 아래 화면은 키보드로도 닿지 않게 하며 낭독으로 알림 */}
      <p role="status" className="sr-only">
        {state.saving ? BUNDLE_MESSAGES.editSaving : ''}
      </p>
      {state.saving ? <PageLoading /> : null}
      <div ref={screenRef} inert={state.saving} className="contents">
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
          galleryImporting={galleryImporting}
        />
      </div>
    </>
  );
}
