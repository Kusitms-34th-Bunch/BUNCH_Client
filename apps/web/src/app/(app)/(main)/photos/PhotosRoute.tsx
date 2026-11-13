'use client';

import { useQuery } from '@tanstack/react-query';
import type { PhotoBoxPreview } from '@/features/photo-box/lib/preview';
import { useBunchSwitcher } from '@/features/bunch-home/hooks/useBunchSwitcher';
import { PhotoBox } from '@/features/photo-box/components';
import { myProfileQueryOptions } from '@/shared/query/myProfile';

type PhotosRouteProps = {
  preview?: PhotoBoxPreview | undefined;
};

/**
 * 사진함 헤더의 번치 이름으로 번치 전환 시트를 엶(번치 탭과 같은 시트, 기능명세 3.1.1)
 * 사진함이 번치 홈 내부 파일을 직접 import하지 않도록 route에서 조합하고, 지금 번치는 기본 번치(`members/me`)를 봄
 */
export function PhotosRoute({ preview }: PhotosRouteProps) {
  const { data: profile } = useQuery(myProfileQueryOptions());
  const switcher = useBunchSwitcher(profile?.bunch ?? undefined);
  return <PhotoBox preview={preview} bunchSwitcher={switcher} />;
}
