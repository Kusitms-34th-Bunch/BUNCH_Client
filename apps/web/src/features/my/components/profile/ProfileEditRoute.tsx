'use client';

import { useEffect, useRef, useState } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import type { MyProfile } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { useMyProfile } from '../../queries/profile';
import { ProfileEditScreen } from './ProfileEditScreen';

/**
 * 개인 프로필 수정과 내 프로필 API를 잇는 컨테이너
 * 지금 값을 채워야 하므로 받을 때까지 전체 로딩, 받지 못하면 마이페이지로 돌아가 그 화면에서 오류 토스트를 보임(기능명세서 7.2.1 예외)
 * 처음 받은 값을 고정해, 편집 중에 재조회 응답이 와도 "바뀐 내용" 판단의 기준이 흔들리지 않게 함
 */
export function ProfileEditRoute() {
  // 실패하면 마이페이지로 이동하므로 토스트는 훅이 즉시 띄우지 않고 이동 뒤 도착 화면에서 보이게 예약
  const { profile, isPending, isError } = useMyProfile({ notifyFailure: false });
  const backOr = useBackOr();
  const [initial, setInitial] = useState<MyProfile | undefined>(profile);
  if (initial === undefined && profile !== undefined) setInitial(profile);
  const shown = initial ?? profile;
  const failed = isError && !shown;
  // backOr는 렌더마다 새로 만들어지므로 한 번만 돌아가도록 막음
  const left = useRef(false);

  useEffect(() => {
    if (!failed || left.current) return;
    left.current = true;
    toastAfterNavigation(MY_MESSAGES.profileLoadFailed);
    backOr(MY_PATHS.home);
  }, [failed, backOr]);

  return (
    <>
      {/* 불러오는 중임을 스크린 리더에 알림(PageLoading은 안내를 호출하는 쪽에 맡김, 항상 마운트해 변화가 읽히게 함) */}
      <p role="status" className="sr-only">
        {isPending && !shown ? MY_MESSAGES.profileLoading : ''}
      </p>
      {shown ? <ProfileEditScreen profile={shown} /> : isPending ? <PageLoading /> : null}
    </>
  );
}
