'use client';

import { toast } from '@app/design-system';
import { useEffect } from 'react';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_CONTACT_URL } from '../../constants/paths';
import { EMPTY_MY_PROFILE } from '../../lib/profile';
import { useMyProfile } from '../../queries/profile';
import { MyScreen } from './MyScreen';

/**
 * MY 탭 첫 화면과 내 프로필 API를 잇는 컨테이너
 * 첫 응답을 기다리는 동안 프로필 영역만 스켈레톤(메뉴는 고정이라 바로 씀), 실패하면 토스트를 띄우고 빈 프로필로 그림(기능명세서 7.1.1 예외)
 */
export function MyRoute() {
  const { profile, isPending, isError } = useMyProfile();

  useEffect(() => {
    if (isError) toast(MY_MESSAGES.profileLoadFailed);
  }, [isError]);

  return (
    <>
      {/* 불러오는 중임을 스크린 리더에 알림(스켈레톤은 숨김이라 안내를 여기서 맡음, 항상 마운트해 변화가 읽히게 함) */}
      <p role="status" className="sr-only">
        {isPending ? MY_MESSAGES.profileLoading : ''}
      </p>
      <MyScreen
        profile={profile ?? EMPTY_MY_PROFILE}
        contactUrl={MY_CONTACT_URL}
        profileLoading={isPending}
      />
    </>
  );
}
