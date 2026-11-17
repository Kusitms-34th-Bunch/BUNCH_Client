'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNDLE_PATHS } from '../../constants/paths';
import { useBundleEditContext } from '../../contexts/bundleEditContext';
import { clearPhotoAddEntry, isPhotoAddEntry } from '../../lib/photoAddEntry';
import { DraftPhotoAdd } from '../drafts/DraftPhotoAdd';
import { BundleEditError } from './BundleEditError';

/**
 * 사진 추가 화면이 보는 사진함: route가 사진함 상태를 받아 넘김(사진함 목록 hook과 오류·번치 없음 화면은 photo-box feature의 것이라 이 feature가 직접 잇지 않음)
 * 오류·번치 없음은 route가 그린 화면(`screen`)을 그대로 보임
 */
export type EditPhotoBox =
  | { kind: 'loading' }
  | { kind: 'error'; screen: ReactNode }
  | { kind: 'no-bunch'; screen: ReactNode }
  | { kind: 'ready'; data: Parameters<typeof DraftPhotoAdd>[0]['data'] };

type BundleEditPhotoAddProps = {
  photoBox: EditPhotoBox;
};

/**
 * `/bunches/[bunchId]/bundles/[bundleId]/edit/photos/add` 수정 중 사진 추가 화면: 수정 화면과 같은 편집 상태에 사진을 더하고 뺌
 * 적용해도 서버에는 보내지 않고 수정 화면의 「저장」에서 한 번에 반영함. 권한이 없거나 없는 번들·발행 전 번들이면 수정 화면으로 보내 그 화면이 판단하게 하고, 주소로 직접 들어와 돌아갈 기록이 없으면 뒤로 갈 때 수정 화면으로 보냄
 */
export function BundleEditPhotoAdd({ photoBox }: BundleEditPhotoAddProps) {
  const router = useRouter();
  const { bunchId, bundleId, state, actions } = useBundleEditContext();
  // 수정 화면에서 앱 안으로 들어왔을 때만 이전 기록으로 돌아감. 직접 주소·새로고침이면 기록을 믿지 않음
  const [fromApp] = useState(isPhotoAddEntry);
  useEffect(() => clearPhotoAddEntry, []);
  const editPath = BUNDLE_PATHS.edit(bunchId, bundleId);
  const kind = state.kind;

  // 수정 화면이 먼저 상태를 판단하도록 준비되지 않은 상태에서는 그 화면으로 보냄(권한 안내·삭제·초안 처리는 거기서 함)
  useEffect(() => {
    if (kind === 'forbidden' || kind === 'missing' || kind === 'draft') router.replace(editPath);
  }, [kind, router, editPath]);

  if (state.kind === 'error')
    return <BundleEditError onRetry={state.retry} onBack={() => router.replace(editPath)} />;
  if (state.kind !== 'ready' || photoBox.kind === 'loading') return <PageLoading />;
  if (photoBox.kind !== 'ready') return photoBox.screen;

  const goBack = () =>
    fromApp && window.history.length > 1 ? router.back() : router.replace(editPath);
  return (
    <DraftPhotoAdd
      draft={state.draft}
      data={photoBox.data}
      actions={actions}
      onBack={goBack}
      onApplied={goBack}
    />
  );
}
