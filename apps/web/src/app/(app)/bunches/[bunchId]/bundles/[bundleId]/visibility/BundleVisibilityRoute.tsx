'use client';

import { useQuery } from '@tanstack/react-query';
import { otherBunchHomeQueryOptions } from '@/features/bunch-home/queries/otherBunch';
import { BundleVisibilityScreen } from '@/features/feed/components';
import { myProfileQueryOptions } from '@/shared/query/myProfile';

/**
 * 공개 범위 화면에 번들의 번치가 비공개인지(「전체 공개」가 「일부 공개」로 보이는 기준)를 알려 주는 route 조합
 * feature끼리 import하지 않으므로 번치 홈 데이터는 route에서 읽어 넘김. 아직 모르면 공개 번치로 보임
 */
export function BundleVisibilityRoute({
  bunchId,
  bundleId,
}: {
  bunchId: string;
  bundleId: string;
}) {
  const { data: profile } = useQuery(myProfileQueryOptions());
  const viewerId = profile === undefined ? undefined : (profile.bunch?.id ?? null);
  const { data: home } = useQuery(otherBunchHomeQueryOptions(bunchId, viewerId));

  return (
    <BundleVisibilityScreen
      bunchId={bunchId}
      bundleId={bundleId}
      bunchPrivate={home?.bunch.visibility === 'PRIVATE'}
    />
  );
}
