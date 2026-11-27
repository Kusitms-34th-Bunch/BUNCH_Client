'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import type { PhotoBoxPreview } from '@/features/photo-box/lib/preview';
import { useBunchSwitcher } from '@/features/bunch-home/hooks/useBunchSwitcher';
import { useBundleEntryCheck } from '@/features/bundle/hooks/useBundleEntryCheck';
import { PhotoBox } from '@/features/photo-box/components';
import { myProfileQueryOptions } from '@/shared/query/myProfile';

type PhotosRouteProps = {
  preview?: PhotoBoxPreview | undefined;
};

/**
 * 사진함 헤더의 번치 이름으로 번치 전환 시트를 엶(번치 탭과 같은 시트·전환 모션, 기능명세 3.1.1)
 * 선택 모드 「번들 만들기」의 진입 확인도 번들 만들기 feature에서 가져와 넘김(3.3.4)
 * 사진함이 번치 홈 내부 파일을 직접 import하지 않도록 route에서 조합하고, 지금 번치는 기본 번치(`members/me`)를 봄
 */
export function PhotosRoute({ preview }: PhotosRouteProps) {
  // `PhotoBox` 안의 `usePhotoBox`도 같은 key(`members/me`)를 구독해 요청은 하나로 합쳐짐: route는 전환 시트에 지금 번치만 알려 줌
  const { data: profile } = useQuery(myProfileQueryOptions());
  // 번치 전환 모션이 사진함 화면 전체를 찾는 기준(감싸기만 하고 배치에는 끼지 않음)
  const screenRef = useRef<HTMLDivElement>(null);
  const switcher = useBunchSwitcher(profile?.bunch ?? undefined, screenRef);
  // 선택 모드 「번들 만들기」 전 멤버 수·초안 수 확인(번들 만들기 feature의 확인을 조합, 기능명세 3.3.4)
  const checkBundleEntry = useBundleEntryCheck();
  return (
    <div ref={screenRef} className="contents">
      <PhotoBox preview={preview} bunchSwitcher={switcher} checkBundleEntry={checkBundleEntry} />
    </div>
  );
}
