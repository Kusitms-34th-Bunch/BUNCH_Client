'use client';

import type { ComponentProps } from 'react';
import { BundleEditPhotoAdd } from '@/features/bundle/components';
import { BUNDLE_MESSAGES } from '@/features/bundle/constants/messages';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';
import { useBundleEditContext } from '@/features/bundle/contexts/bundleEditContext';
import { NoBunch } from '@/features/photo-box/components/NoBunch';
import { PhotoBoxError } from '@/features/photo-box/components/PhotoBoxError';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';

/** 수정 중 사진 추가 화면: 사진함 목록과 오류·번치 없음 화면은 route에서 이어 줌(feature끼리 직접 잇지 않음) */
export function BundleEditPhotoAddRoute() {
  const { state, retry } = usePhotoBox();
  const { bunchId, bundleId } = useBundleEditContext();
  const backOr = useBackOr();
  const photoBox: ComponentProps<typeof BundleEditPhotoAdd>['photoBox'] =
    state.kind === 'ready'
      ? { kind: 'ready', data: state.data }
      : state.kind === 'error'
        ? {
            kind: 'error',
            screen: (
              <PhotoBoxError
                onRetry={retry}
                onBack={() => backOr(BUNDLE_PATHS.edit(bunchId, bundleId))}
              />
            ),
          }
        : state.kind === 'no-bunch'
          ? {
              kind: 'no-bunch',
              screen: (
                <PageShell>
                  <h1 className="sr-only">{BUNDLE_MESSAGES.photoAddTitle}</h1>
                  <NoBunch />
                </PageShell>
              ),
            }
          : { kind: 'loading' };
  return <BundleEditPhotoAdd photoBox={photoBox} />;
}
