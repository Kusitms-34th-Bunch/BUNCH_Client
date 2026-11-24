'use client';

import { Button, cn, Header, toast } from '@app/design-system';
import { FollowListItem, MenuTabs, NudgeBanner } from '@app/design-system/web';
import { type RefObject, useRef, useState } from 'react';
import { HeaderBackButton } from '@/shared/components/layout/HeaderBackButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ProfileListSkeleton } from '@/shared/components/skeleton/ProfileRowSkeleton';
import type { FollowStatus } from '../lib/types';
import type { FollowListState, FollowRow } from '../model/follows';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BunchFollowsSkeleton } from './BunchFollowsSkeleton';
import { ListMore } from './ListMore';
import { PrivateBunchNotice } from './PrivateBunchNotice';

export type FollowsTab = 'followers' | 'following';

type BunchFollowsScreenProps = {
  /** 목록 주인 번치 이름(첫 hydration에 내 번치를 아직 모르면 undefined, 목록도 그리지 않음) */
  bunchName: string | undefined;
  followerCount: number;
  followingCount: number;
  /** 행의 버튼은 지금 내 번치(명의)의 팔로우 상태 */
  followers: FollowListState;
  following: FollowListState;
  /** 명의 번치 id. 그 번치 행은 버튼을 숨김(나 자신) */
  viewerId?: string | null | undefined;
  /** 명의를 다시 확인하는 중(모든 버튼을 눌러도 보내지 않음) */
  busy?: boolean | undefined;
  /** 프로필에서 누른 수(팔로워·팔로잉)의 탭 */
  initialTab: FollowsTab;
  /** 팔로우 승인 전의 비공개 번치: 목록 대신 안내(주소로 직접 들어온 경우) */
  locked?: boolean | undefined;
  /** 내 번치의 대기 중인 팔로우 요청 수. 0이거나 없으면 「팔로우 요청」 줄을 숨김, null(수를 못 받음)이면 수 없이 줄만 */
  pendingRequestCount?: number | null | undefined;
  onOpenRequests?: (() => void) | undefined;
  /** 행의 이미지·이름을 눌렀을 때(그 번치 프로필로 이동, 5.11.1 상세 5) */
  onOpenBunch?: ((_bunch: FollowRow) => void) | undefined;
  onBack: () => void;
  /** 팔로우·요청. 끝나면 서버가 정한 상태, 실패하면 reject(안내는 부르는 쪽) */
  onFollow: (_bunch: FollowRow) => Promise<FollowStatus>;
  /** 언팔로우·팔로우 요청 취소 */
  onUnfollow: (_bunch: FollowRow) => Promise<unknown>;
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
 * 버튼은 확인 없이 바로 팔로우·언팔로우하고 서버 처리가 끝나면 토스트로 알림(3-1번). 이미지·이름은 그 번치 프로필로
 */
export function BunchFollowsScreen({
  bunchName,
  followerCount,
  followingCount,
  followers,
  following,
  viewerId,
  busy: allBusy = false,
  initialTab,
  locked = false,
  pendingRequestCount = 0,
  onOpenRequests,
  onOpenBunch,
  onBack,
  onFollow,
  onUnfollow,
}: BunchFollowsScreenProps) {
  const [tab, setTab] = useState<FollowsTab>(initialTab);

  // 처리 중인 행(다시 눌러도 보내지 않음)
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  // 비공개 번치 요청 결과는 화면 토스트가 없어 스크린 리더에만 알림(기획 원문 없는 접근성 안내)
  const [announcement, setAnnouncement] = useState('');

  const toggle = async (bunch: FollowRow) => {
    if (allBusy || pendingIds.has(bunch.id)) return;
    setPendingIds((ids) => new Set(ids).add(bunch.id));
    // 같은 문구가 이어져도 다시 낭독되게 시작할 때 비움
    setAnnouncement('');
    try {
      if (bunch.followStatus === 'none') {
        const status = await onFollow(bunch);
        // 비공개 번치 요청은 토스트 없이 버튼만 「요청됨」으로 바뀜(기능명세 5.10.3)
        if (status === 'requested')
          setAnnouncement(BUNCH_HOME_MESSAGES.followRequested(bunch.name));
        else toast(BUNCH_HOME_MESSAGES.followed(bunch.name));
      } else {
        await onUnfollow(bunch);
        toast(
          bunch.followStatus === 'requested'
            ? BUNCH_HOME_MESSAGES.requestCanceled
            : BUNCH_HOME_MESSAGES.unfollowed(bunch.name),
        );
      }
    } catch {
      // 실패 안내는 mutation 공통 토스트(meta)
    } finally {
      setPendingIds((ids) => {
        const next = new Set(ids);
        next.delete(bunch.id);
        return next;
      });
    }
  };

  // 탭마다 목록(이어서 받기의 초점 기준)
  const followersRef = useRef<HTMLUListElement>(null);
  const followingRef = useRef<HTMLUListElement>(null);
  const list = (
    { rows, error, more }: FollowListState,
    empty: string,
    listRef: RefObject<HTMLUListElement | null>,
  ) => {
    if (error) {
      return (
        <div className="gap-s6 py-s10 flex flex-col items-center">
          <p role="alert" className="typography-body-3-regular text-text-tertiary text-center">
            {BUNCH_HOME_MESSAGES.followListFailed}
          </p>
          <Button variant="tertiary" size="sm" onClick={error.retry}>
            다시 시도
          </Button>
        </div>
      );
    }
    if (!rows) {
      return (
        <>
          <p role="status" className="sr-only">
            {BUNCH_HOME_MESSAGES.followListLoading}
          </p>
          <ProfileListSkeleton variant="plain" trailing={1} count={5} />
        </>
      );
    }
    if (rows.length === 0) {
      return (
        // 빈 목록은 화면에 아무것도 두지 않음(기능명세 5.11.1), 스크린 리더에만 알림
        <p className="sr-only">{empty}</p>
      );
    }
    return (
      <>
        <ul ref={listRef} tabIndex={-1} className="flex flex-col outline-none">
          {rows.map((bunch) => {
            const label = STATUS_LABELS[bunch.followStatus];
            const busy = allBusy || pendingIds.has(bunch.id);
            // 나 자신(명의 번치)과 명의가 없는 회원은 버튼 없음
            const canFollow = viewerId !== null && bunch.id !== viewerId;
            return (
              <li key={bunch.id}>
                <FollowListItem
                  name={bunch.name}
                  imageSrc={bunch.imageSrc}
                  isPrivate={bunch.isPrivate}
                  privateLabel="비공개 번치"
                  onProfileClick={onOpenBunch ? () => onOpenBunch(bunch) : undefined}
                  action={
                    canFollow ? (
                      // Figma SolidButton 32: 팔로우는 진한 바탕, 팔로잉·요청됨은 회색 바탕. 처리 중은 흐리게
                      <Button
                        size="sm"
                        variant={bunch.followStatus === 'none' ? 'primary' : 'secondarySubtle'}
                        aria-label={`${bunch.name} ${label}${STATUS_ACTIONS[bunch.followStatus]}`}
                        aria-disabled={busy || undefined}
                        className={cn('transition-opacity', busy && 'opacity-60')}
                        onClick={() => void toggle(bunch)}
                      >
                        {label}
                      </Button>
                    ) : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
        {more ? <ListMore query={more} listRef={listRef} /> : null}
      </>
    );
  };

  return (
    <PageShell header={<Header leading={<HeaderBackButton tone="subtle" onClick={onBack} />} />}>
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
            {(pendingRequestCount === null || pendingRequestCount > 0) && onOpenRequests ? (
              <NudgeBanner onClick={onOpenRequests}>
                {pendingRequestCount === null
                  ? BUNCH_HOME_MESSAGES.followRequestsBannerUnknown
                  : BUNCH_HOME_MESSAGES.followRequestsBanner(pendingRequestCount)}
              </NudgeBanner>
            ) : null}
            {list(followers, BUNCH_HOME_MESSAGES.followersEmpty, followersRef)}
          </MenuTabs.Panel>
          <MenuTabs.Panel value="following" className={`px-padding-p8 ${DISSOLVE}`}>
            {list(following, BUNCH_HOME_MESSAGES.followingEmpty, followingRef)}
          </MenuTabs.Panel>
        </MenuTabs.Root>
      ) : (
        <>
          <p role="status" className="sr-only">
            {BUNCH_HOME_MESSAGES.followListLoading}
          </p>
          <BunchFollowsSkeleton selected={initialTab} />
        </>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </PageShell>
  );
}
