'use client';

import { useQuery } from '@tanstack/react-query';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { otherBunchHomeQueryOptions } from '@/features/bunch-home/queries/otherBunch';
import { BundleDetailScreen } from '@/features/feed/components';
import { myProfileQueryOptions } from '@/shared/query/myProfile';

// 상세에서 번치 쪽 화면으로 가는 주소(기능끼리 직접 import하지 않고 route에서 조합)
const links = { bunchHome: BUNCH_HOME_PATHS.home, otherBunch: BUNCH_HOME_PATHS.otherBunch };

/**
 * 발행 번들 상세에는 번치 이름·이미지가 없어 번치 홈 응답의 `bunch`를 읽어 넘김(다른 번치 화면과 같은 캐시)
 * 내 정보를 받기 전에는 명의를 몰라 요청하지 않음
 */
export function BundleDetailRoute({
  bunchId,
  bundleId,
  focusComments,
}: {
  bunchId: string;
  bundleId: string;
  focusComments: boolean;
}) {
  const { data: profile } = useQuery(myProfileQueryOptions());
  const viewerId = profile === undefined ? undefined : (profile.bunch?.id ?? null);
  const home = useQuery(otherBunchHomeQueryOptions(bunchId, viewerId));

  return (
    <BundleDetailScreen
      bunchId={bunchId}
      bundleId={bundleId}
      // 받지 못하면 null(상세는 번치 이름 없이 보임)
      bunch={home.data?.bunch ?? (home.isError ? null : undefined)}
      focusComments={focusComments}
      links={links}
    />
  );
}
