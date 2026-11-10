'use client';

import { Button, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { FollowListItem, MenuTabs, NudgeBanner } from '@app/design-system/web';
import { useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { FollowBunch, FollowStatus } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { PrivateBunchNotice } from './PrivateBunchNotice';

export type FollowsTab = 'followers' | 'following';

type BunchFollowsScreenProps = {
  /** 목록 주인 번치 이름(첫 hydration에 내 번치를 아직 모르면 undefined, 목록도 그리지 않음) */
  bunchName: string | undefined;
  followerCount: number;
  followingCount: number;
  /** 버튼에 보일 팔로우 상태는 저장소를 반영한 값 */
  followers: readonly FollowBunch[];
  following: readonly FollowBunch[];
  /** 프로필에서 누른 수(팔로워·팔로잉)의 탭 */
  initialTab: FollowsTab;
  /** 팔로우 승인 전의 비공개 번치: 목록 대신 안내(주소로 직접 들어온 경우) */
  locked?: boolean | undefined;
  /** 내 번치의 대기 중인 팔로우 요청 수. 0이거나 없으면 「팔로우 요청」 줄을 숨김 */
  pendingRequestCount?: number | undefined;
  onOpenRequests?: (() => void) | undefined;
  onBack: () => void;
  onFollow: (_bunch: FollowBunch) => void;
  /** 언팔로우·팔로우 요청 취소 */
  onUnfollow: (_bunch: FollowBunch) => void;
};

const STATUS_LABELS: Record<FollowStatus, string> = {
  none: '팔로우',
  following: '팔로잉',
  requested: '요청됨',
};
// 「팔로잉」·「요청됨」은 상태 이름이라, 누르면 확인 없이 바로 취소된다는 동작을 이름에 덧붙임
const STATUS_ACTIONS: Record<FollowStatus, string> = {
  none: '',
  following: ', 누르면 팔로우 취소',
  requested: ', 누르면 요청 취소',
};

// 탭 전환: Dissolve / Ease out / 150ms(화면설계서 2500:71333 1번). 새 패널은 마운트될 때 투명에서 시작
const DISSOLVE =
  'transition-opacity duration-150 ease-out starting:opacity-0 motion-reduce:transition-none';

/**
 * 팔로워·팔로잉 목록(기능명세 5.11, 화면설계서 2500:71333·2500:72664, Figma 2500:73493)
 * 버튼은 확인 없이 바로 팔로우·언팔로우하고 토스트로 알림(3-1번). 행 자체는 누를 수 없음
 */
export function BunchFollowsScreen({
  bunchName,
  followerCount,
  followingCount,
  followers,
  following,
  initialTab,
  locked = false,
  pendingRequestCount = 0,
  onOpenRequests,
  onBack,
  onFollow,
  onUnfollow,
}: BunchFollowsScreenProps) {
  const [tab, setTab] = useState<FollowsTab>(initialTab);

  const toggle = (bunch: FollowBunch) => {
    if (bunch.followStatus === 'none') {
      onFollow(bunch);
      toast(
        bunch.isPrivate
          ? BUNCH_HOME_MESSAGES.followRequested(bunch.name)
          : BUNCH_HOME_MESSAGES.followed(bunch.name),
      );
      return;
    }
    onUnfollow(bunch);
    toast(
      bunch.followStatus === 'requested'
        ? BUNCH_HOME_MESSAGES.requestCanceled(bunch.name)
        : BUNCH_HOME_MESSAGES.unfollowed(bunch.name),
    );
  };

  const list = (bunches: readonly FollowBunch[], empty: string) =>
    bunches.length > 0 ? (
      <ul className="flex flex-col">
        {bunches.map((bunch) => {
          const label = STATUS_LABELS[bunch.followStatus];
          return (
            <li key={bunch.id}>
              <FollowListItem
                name={bunch.name}
                imageSrc={bunch.imageSrc}
                isPrivate={bunch.isPrivate}
                privateLabel="비공개 번치"
                action={
                  // Figma SolidButton 32: 팔로우는 진한 바탕, 팔로잉·요청됨은 회색 바탕
                  <Button
                    size="sm"
                    variant={bunch.followStatus === 'none' ? 'primary' : 'secondarySubtle'}
                    aria-label={`${bunch.name} ${label}${STATUS_ACTIONS[bunch.followStatus]}`}
                    onClick={() => toggle(bunch)}
                  >
                    {label}
                  </Button>
                }
              />
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="typography-body-3-regular text-text-tertiary py-s10 text-center">{empty}</p>
    );

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="sr-only">{bunchName ? `${bunchName} 팔로워·팔로잉` : '팔로워·팔로잉'}</h1>
      {locked ? (
        <PrivateBunchNotice
          description={BUNCH_HOME_MESSAGES.privateListDescription}
          className="mx-padding-p8 mt-s6"
        />
      ) : bunchName !== undefined ? (
        // 탭 아래 12, 요청 줄과 목록 사이 12(Figma 2500:73493)
        <MenuTabs.Root
          value={tab}
          onValueChange={(value) => setTab(value as FollowsTab)}
          className="gap-s6 pb-s8 flex flex-col"
        >
          <MenuTabs.List aria-label="팔로워·팔로잉" className="px-padding-p8">
            {/* 두 탭이 폭을 나눠 가짐(Figma Menu_Tap 171.5씩) */}
            <MenuTabs.Tab
              value="followers"
              label="팔로워"
              count={followerCount}
              className="flex-1 transition-colors duration-150 ease-out motion-reduce:transition-none"
            />
            <MenuTabs.Tab
              value="following"
              label="팔로잉"
              count={followingCount}
              className="flex-1 transition-colors duration-150 ease-out motion-reduce:transition-none"
            />
          </MenuTabs.List>
          <MenuTabs.Panel
            value="followers"
            className={`px-padding-p8 gap-s6 flex flex-col ${DISSOLVE}`}
          >
            {pendingRequestCount > 0 && onOpenRequests ? (
              <NudgeBanner onClick={onOpenRequests}>
                {BUNCH_HOME_MESSAGES.followRequestsBanner(pendingRequestCount)}
              </NudgeBanner>
            ) : null}
            {list(followers, BUNCH_HOME_MESSAGES.followersEmpty)}
          </MenuTabs.Panel>
          <MenuTabs.Panel value="following" className={`px-padding-p8 ${DISSOLVE}`}>
            {list(following, BUNCH_HOME_MESSAGES.followingEmpty)}
          </MenuTabs.Panel>
        </MenuTabs.Root>
      ) : null}
    </PageShell>
  );
}
