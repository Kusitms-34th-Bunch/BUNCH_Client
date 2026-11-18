'use client';

import { useEffect, useRef, useState } from 'react';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import type { MyProfile } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { useAdditionalInfo } from '../../queries/additionalInfo';
import { useMyProfile } from '../../queries/profile';
import { ProfileEditScreen } from './ProfileEditScreen';

type Initial = { profile: MyProfile; consented: boolean };

/**
 * 개인 프로필 수정과 내 프로필·추가 개인정보 API를 잇는 컨테이너
 * 지금 값을 채워야 하므로 둘 다 받을 때까지 전체 로딩, 하나라도 받지 못하면 마이페이지로 돌아가 그 화면에서 오류 토스트를 보임(기능명세서 7.2.1 예외)
 * 출생연도·성별은 추가 개인정보 동의 상태에 따라 표시·숨김(기능명세서 7.2.6 로직 4)
 * 이번 진입의 두 조회가 끝난 뒤의 값으로 초기값을 고정함(받아 둔 옛 캐시로 채우면 다른 기기에서 바꾼 값을 저장 때 덮어씀)
 * 고정한 뒤에는 편집 중에 재조회 응답이 와도 "바뀐 내용" 판단의 기준이 흔들리지 않게 함
 * 동의 상태만은 다시 받은 값이 철회면 따라감(저장이 거부된 뒤 영역을 숨김). 연 사이 새로 동의했으면 다시 들어와야 보임(기능명세서 7.2.6 예외)
 */
export function ProfileEditRoute() {
  // 실패하면 마이페이지로 이동하므로 토스트는 이동 뒤 도착 화면에서 보이게 예약
  const profileQuery = useMyProfile();
  const infoQuery = useAdditionalInfo();
  const backOr = useBackOr();
  // 진입 때 다시 받기(refetchOnMount: always)가 끝나야 이번 진입의 값으로 봄
  const settled = !profileQuery.isFetching && !infoQuery.isFetching;
  const loadFailed = settled && (profileQuery.hasFailed || infoQuery.hasFailed);
  const loaded: Initial | undefined =
    settled && !loadFailed && profileQuery.profile && infoQuery.additionalInfo
      ? {
          profile: {
            ...profileQuery.profile,
            birthYear: infoQuery.additionalInfo.birthYear,
            gender: infoQuery.additionalInfo.gender,
          },
          consented: infoQuery.additionalInfo.consented,
        }
      : undefined;
  const [initial, setInitial] = useState<Initial | undefined>(loaded);
  if (initial === undefined && loaded !== undefined) setInitial(loaded);
  const shown = initial ?? loaded;
  const failed = loadFailed && !shown;
  // 실패한 캐시가 남아 다시 받는 중이어도 아직 값을 고정하지 않았으면 로딩으로 봄
  const loading = !shown && !failed;
  const consented =
    shown !== undefined && shown.consented && (infoQuery.additionalInfo?.consented ?? true);
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
        {loading ? MY_MESSAGES.profileLoading : ''}
      </p>
      {shown ? (
        <ProfileEditScreen profile={shown.profile} demographicsConsent={consented} />
      ) : loading ? (
        <PageLoading />
      ) : null}
    </>
  );
}
