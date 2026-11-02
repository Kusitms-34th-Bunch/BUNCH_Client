'use client';

import { Header, LineBellLargeIcon, LineChevronLeftLargeIcon } from '@app/design-system';
import { FollowButton } from '@app/design-system/web';
import Link from 'next/link';
import { useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { FollowStatus, OtherBunch } from '../lib/types';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS, followingTab } from '../constants/paths';
import { headerIconLinkClass } from './BunchHomeHeader';
import { BunchProfile } from './BunchProfile';
import { CompletedBundleGrid } from './CompletedBundleGrid';
import { FollowCancelSheet } from './FollowCancelSheet';
import { PrivateBunchNotice } from './PrivateBunchNotice';

type OtherBunchScreenProps = {
  bunch: OtherBunch;
  /** 지금 팔로우 상태(저장소 반영) */
  status: FollowStatus;
  /** 팔로우 상태를 반영한 팔로워 수 */
  followerCount: number;
  onBack: () => void;
  onFollow: () => void;
  /** 언팔로우·팔로우 요청 취소 */
  onUnfollow: () => void;
};

/**
 * 다른 번치 프로필(기능명세 5.10, 화면설계서 2500:68583, Figma 3086:68423·68534·68654·68758)
 * 공개 번치와 팔로우 중인 비공개 번치는 번들, 나머지 비공개 번치는 가림 안내
 * 「팔로잉」·「팔로우 요청됨」은 확인 시트로 취소(3·4번)
 */
export function OtherBunchScreen({
  bunch,
  status,
  followerCount,
  onBack,
  onFollow,
  onUnfollow,
}: OtherBunchScreenProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // 시트를 연 때의 상태(취소한 뒤 닫히는 동안 문구가 바뀌지 않게)
  const [sheetFor, setSheetFor] = useState<FollowStatus>('following');
  const locked = bunch.isPrivate && status !== 'following';
  // 버튼 이름만 바뀌면 스크린 리더가 결과를 놓칠 수 있어 상태 영역으로도 알림
  const [announcement, setAnnouncement] = useState('');
  const follow = () => {
    onFollow();
    setAnnouncement(
      bunch.isPrivate
        ? BUNCH_HOME_MESSAGES.followRequested(bunch.name)
        : BUNCH_HOME_MESSAGES.followed(bunch.name),
    );
  };

  return (
    <PageShell
      data-app-background="brand-subtle-1"
      className="from-surface-brand-subtle-1 to-surface-primary bg-linear-to-b from-50% to-50%"
      header={
        <Header
          className="bg-surface-brand-subtle-1"
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={onBack}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
          // 더보기(차단·신고)는 다른 번치 차단·신고 단위에서 추가
          trailing={
            <Link
              href={BUNCH_HOME_PATHS.notifications}
              aria-label="알림"
              className={headerIconLinkClass}
            >
              <LineBellLargeIcon />
            </Link>
          }
        />
      }
    >
      <div className="flex min-h-full flex-col">
        {/* 번치 홈과 같은 캐릭터 영역(에셋 전 회색 자리표시)과 흰 시트 */}
        <div className="bg-surface-brand-subtle-1 relative h-34.5 shrink-0">
          <div
            aria-hidden="true"
            className="right-s8 bg-surface-tertiary absolute top-7.5 z-10 size-30"
          />
        </div>
        <div className="bg-surface-primary rounded-t-r10 pt-padding-p16 gap-s8 pb-s8 relative -mt-5 flex flex-1 flex-col">
          {/* 프로필 아래 팔로우 버튼 16, 버튼 아래 번들·안내 16(Figma 3086:68423) */}
          <div className="gap-s8 flex flex-col">
            <BunchProfile
              bunch={{ ...bunch, followerCount }}
              showPlaces={false}
              // 비공개 번치는 승인 전에 수치만 보이고 목록은 열 수 없음(기능명세 5.10)
              countHrefs={
                locked
                  ? undefined
                  : {
                      followerCount: BUNCH_HOME_PATHS.otherBunchFollows(bunch.id),
                      followingCount: followingTab(BUNCH_HOME_PATHS.otherBunchFollows(bunch.id)),
                      memberCount: BUNCH_HOME_PATHS.otherBunchMembers(bunch.id),
                    }
              }
            />
            <div className="px-padding-p8">
              <FollowButton
                status={status === 'none' ? 'follow' : status}
                className="w-full"
                aria-haspopup={status === 'none' ? undefined : 'dialog'}
                onClick={() => {
                  if (status === 'none') return follow();
                  setSheetFor(status);
                  setSheetOpen(true);
                }}
              />
            </div>
          </div>
          {locked ? (
            <PrivateBunchNotice
              description={BUNCH_HOME_MESSAGES.privateBunchDescription}
              className="mx-padding-p8"
            />
          ) : (
            <section aria-label="번들">
              <CompletedBundleGrid bundles={bunch.completedBundles} />
            </section>
          )}
        </div>
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>
      <FollowCancelSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        bunchName={bunch.name}
        bunchImageSrc={bunch.imageSrc}
        status={
          sheetFor === 'requested'
            ? BUNCH_HOME_MESSAGES.requestPending
            : bunch.isPrivate
              ? BUNCH_HOME_MESSAGES.followingPrivate
              : BUNCH_HOME_MESSAGES.followingPublic
        }
        question={
          sheetFor === 'requested'
            ? BUNCH_HOME_MESSAGES.cancelRequestQuestion
            : BUNCH_HOME_MESSAGES.unfollowQuestion
        }
        confirmLabel={sheetFor === 'requested' ? '팔로우 요청 취소' : '팔로우 취소'}
        onConfirm={() => {
          setSheetOpen(false);
          onUnfollow();
          setAnnouncement(
            sheetFor === 'requested'
              ? BUNCH_HOME_MESSAGES.requestCanceled(bunch.name)
              : BUNCH_HOME_MESSAGES.unfollowed(bunch.name),
          );
        }}
      />
    </PageShell>
  );
}
