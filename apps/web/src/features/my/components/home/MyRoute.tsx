'use client';

import { PageLoading } from '@/shared/components/loading/PageLoading';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_CONTACT_URL } from '../../constants/paths';
import { EMPTY_MY_PROFILE } from '../../lib/profile';
import { useMyProfile } from '../../queries/profile';
import { MyScreen } from './MyScreen';

/**
 * MY 탭 첫 화면과 내 프로필 API를 잇는 컨테이너
 * 첫 응답을 기다리는 동안 전체 로딩, 실패해도 메뉴는 그대로 쓸 수 있게 빈 프로필로 그림(기능명세서 7.1.1 예외)
 */
export function MyRoute() {
  const { profile, isPending } = useMyProfile();

  return (
    <>
      {/* 불러오는 중임을 스크린 리더에 알림(PageLoading은 안내를 호출하는 쪽에 맡김, 항상 마운트해 변화가 읽히게 함) */}
      <p role="status" className="sr-only">
        {isPending ? MY_MESSAGES.profileLoading : ''}
      </p>
      <MyScreen profile={profile ?? EMPTY_MY_PROFILE} contactUrl={MY_CONTACT_URL} />
      {isPending ? <PageLoading /> : null}
    </>
  );
}
