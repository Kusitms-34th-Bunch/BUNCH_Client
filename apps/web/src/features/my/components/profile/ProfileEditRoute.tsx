'use client';

import { Button, Header } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import { HeaderBackButton } from '@/shared/components/layout/HeaderBackButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import type { MyProfile } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { useAdditionalInfo } from '../../queries/additionalInfo';
import { useMyProfile, useUpdateProfileMutation } from '../../queries/profile';
import { ProfileEditScreen } from './ProfileEditScreen';
import { ProfileEditSkeleton } from './ProfileEditSkeleton';

type Initial = { profile: MyProfile; consented: boolean };

/**
 * 개인 프로필 수정과 내 프로필·추가 개인정보 API를 잇는 컨테이너
 * 마이페이지가 받아 둔 내 프로필(닉네임·사진)이 있으면 그 값으로 바로 그리고, 이번 진입의 두 조회가 끝날 때까지 입력·저장을 막음
 * 받아 둔 값이 없으면 본문 전체 스켈레톤(헤더·하단 버튼은 실제 모양), 하나라도 받지 못하면 마이페이지로 돌아가 그 화면에서 오류 토스트를 보임(기능명세서 7.2.1 예외)
 * 출생연도·성별은 추가 개인정보 동의 상태에 따라 표시·숨김(기능명세서 7.2.6 로직 4)
 * 이번 진입의 두 조회가 끝난 뒤의 값으로 초기값을 고정함(받아 둔 옛 캐시로 채우면 다른 기기에서 바꾼 값을 저장 때 덮어씀)
 * 고정한 뒤에는 편집 중에 재조회 응답이 와도 "바뀐 내용" 판단의 기준이 흔들리지 않게 함
 * 동의 상태만은 다시 받은 값이 철회면 따라감(저장이 거부된 뒤 영역을 숨김). 연 사이 새로 동의했으면 다시 들어와야 보임(기능명세서 7.2.6 예외)
 */
export function ProfileEditRoute() {
  // 실패하면 마이페이지로 이동하므로 토스트는 이동 뒤 도착 화면에서 보이게 예약
  const profileQuery = useMyProfile();
  const save = useUpdateProfileMutation();
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
  // 고정 전에 먼저 그릴 받아 둔 값(출생연도·성별은 받아 둔 동의 정보가 있을 때만)
  const cached: Initial | undefined =
    !shown && !failed && profileQuery.profile
      ? {
          profile: {
            ...profileQuery.profile,
            birthYear: infoQuery.additionalInfo?.birthYear,
            gender: infoQuery.additionalInfo?.gender,
          },
          consented: infoQuery.additionalInfo?.consented ?? false,
        }
      : undefined;
  // backOr는 렌더마다 새로 만들어지므로 한 번만 돌아가도록 막음
  const left = useRef(false);
  const fresh = shown !== undefined;
  // 새 값 화면 전에 받아 둔 값 화면·스켈레톤을 보였는지(바뀔 때 초점·완료 안내)
  const [showedPlaceholder, setShowedPlaceholder] = useState(false);
  if ((cached || loading) && !showedPlaceholder) setShowedPlaceholder(true);
  const screenRef = useRef<HTMLDivElement>(null);
  const markLeft = () => {
    left.current = true;
  };
  // 새 값 화면으로 새로 그리면 이전 화면에 있던 초점이 문서로 빠짐: 화면 제목으로 옮겨 스크린 리더 위치를 지킴
  useEffect(() => {
    if (!fresh || !showedPlaceholder) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const title = screenRef.current?.querySelector<HTMLElement>('h1');
    if (!title) return;
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }, [fresh, showedPlaceholder]);

  useEffect(() => {
    if (!failed || left.current) return;
    left.current = true;
    toastAfterNavigation(MY_MESSAGES.profileLoadFailed);
    backOr(MY_PATHS.home);
  }, [failed, backOr]);

  return (
    <>
      {/* 불러오는 중임을 스크린 리더에 알림(스켈레톤은 숨김이라 안내를 여기서 맡음, 항상 마운트해 변화가 읽히게 함) */}
      <p role="status" className="sr-only">
        {loading
          ? MY_MESSAGES.profileLoading
          : fresh && showedPlaceholder
            ? MY_MESSAGES.profileLoaded
            : ''}
      </p>
      <div ref={screenRef} className="contents">
        {shown ? (
          // 받아 둔 값으로 그린 화면을 이번 진입의 값으로 새로 그림(입력 전이라 잃는 편집 없음)
          <ProfileEditScreen
            key="fresh"
            profile={shown.profile}
            demographicsConsent={consented}
            onSave={save.mutateAsync}
            saving={save.isPending}
          />
        ) : cached ? (
          <ProfileEditScreen
            key="cached"
            profile={cached.profile}
            demographicsConsent={cached.consented}
            pending
            onLeave={markLeft}
            onSave={save.mutateAsync}
            saving={save.isPending}
          />
        ) : loading ? (
          <ProfileEditLoading
            onBack={() => {
              // 이미 떠났으면 받기 실패 effect가 한 번 더 뒤로 가지 않게
              markLeft();
              backOr(MY_PATHS.home);
            }}
          />
        ) : null}
      </div>
    </>
  );
}

/** 받아 둔 값도 없이 받는 동안의 화면(ProfileEditScreen과 같은 헤더·하단 버튼, 본문 전체 스켈레톤). 저장하기는 받기 전이라 막아 둠 */
function ProfileEditLoading({ onBack }: { onBack: () => void }) {
  return (
    <PageShell
      header={<Header leading={<HeaderBackButton tone="subtle" onClick={onBack} />} />}
      bottom={
        <div className="px-padding-p8 pt-padding-p7">
          <Button className="w-full" disabled>
            {MY_MESSAGES.profileEditSubmit}
          </Button>
        </div>
      }
    >
      <h1 className="sr-only">{MY_MESSAGES.profileEditTitle}</h1>
      <ProfileEditSkeleton />
    </PageShell>
  );
}
