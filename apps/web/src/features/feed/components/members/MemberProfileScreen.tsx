'use client';

import { Button, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { FollowListItem, ProfileImage } from '@app/design-system/web';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { isUnavailableTarget } from '@/shared/api/errorStatus';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import type { FeedFollowStatus, FeedMemberBunch } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { sortMemberBunches } from '../../lib/memberBunches';
import { memberProfileQueryOptions, useRefreshMemberProfile } from '../../queries/memberProfile';

/** 팔로우 바꾸기. 취소의 `followId`는 응답의 관계 ID */
export type MemberFollowChange =
  | { kind: 'follow' }
  | { kind: 'unfollow'; followId: string | undefined };

type MemberProfileScreenProps = {
  memberId: string;
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { bunchHome: string; otherBunch: (_bunchId: string) => string };
  /** 팔로우 요청은 번치 쪽 기능이 보냄(route가 조합). 실패 안내도 그쪽이 띄움. 결과는 서버의 관계 상태 */
  follow: (
    _targetId: string,
    _change: MemberFollowChange,
  ) => Promise<'NONE' | 'REQUESTED' | 'FOLLOWING'>;
};

// 안내는 서버 결과로 고름(누르기 전 상태는 취소였는지 요청 취소였는지만 가림)
const followToast = (
  bunch: FeedMemberBunch,
  before: FeedFollowStatus,
  result: 'NONE' | 'REQUESTED' | 'FOLLOWING',
) => {
  if (result === 'FOLLOWING') return text.followed(bunch.name);
  // 비공개 번치 요청은 토스트 없이 버튼만 바뀜(기능명세 6.3.3 → 5.10.3)
  if (result === 'REQUESTED') return undefined;
  return before === 'requested' ? text.requestCanceled : text.unfollowed(bunch.name);
};

/**
 * 멤버 프로필(기능명세서 6.3.3, Figma `5367:110380`): 프로필 이미지·닉네임, 참여중인 번치와 팔로우
 * 멤버와 참여 번치·팔로우 상태는 서버(명세 020, 지금 번치 기준, 차단 관계 번치는 서버가 뺌). 팔로우는 번치 쪽 기능으로 보냄
 */
export function MemberProfileScreen({ memberId, links, follow }: MemberProfileScreenProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { viewer, viewerFailed, viewerFetching, retryViewer, asBunch } = useFeedViewer();
  const viewerId = viewer === undefined ? undefined : (viewer?.bunchId ?? null);
  const profile = useQuery(memberProfileQueryOptions(memberId, viewerId));
  const refreshProfile = useRefreshMemberProfile(memberId);
  // 보내는 중인 번치(연타해도 한 번만)
  const [sending, setSending] = useState<ReadonlySet<string>>(new Set());
  // 비공개 번치 요청 결과는 화면 토스트가 없어 스크린 리더에만 알림
  const [announcement, setAnnouncement] = useState('');
  const member = profile.data;

  // 「다시 시도」 버튼은 받는 동안 사라지므로, 끝나면 그 화면의 제목(멤버 이름이나 실패 안내)으로 초점
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusTitleAfterRetry = useRef(false);
  useEffect(() => {
    // 덮개 화면(제목 없음)이면 다음 렌더까지 기다림
    if (!focusTitleAfterRetry.current || profile.isFetching || viewerFetching) return;
    if (!titleRef.current) return;
    focusTitleAfterRetry.current = false;
    titleRef.current?.focus({ preventScroll: true });
  });

  const header = (
    <Header
      leading={
        <HeaderIconButton label={text.back} onClick={() => backOr(FEED_PATHS.home)}>
          <LineChevronLeftLargeIcon />
        </HeaderIconButton>
      }
    />
  );

  // 없음·탈퇴·볼 수 없음(404·403)과 잘못된 주소(400)는 같은 안내, 그 밖의 실패는 다시 시도
  // 받아 둔 프로필이 있어도 다시 받기가 실패하면 안내(옛 관계 상태로 다시 보내지 않게)
  const unavailable = isUnavailableTarget(profile.error);
  const failed =
    !unavailable && (profile.isError || (!member && viewer === undefined && viewerFailed));
  if (unavailable || failed) {
    return (
      <PageShell header={header}>
        <div className="gap-s8 flex h-full flex-col items-center justify-center">
          <div role={failed ? 'alert' : undefined}>
            <h1
              ref={titleRef}
              tabIndex={-1}
              className="typography-body-2-regular text-text-quinary text-center"
            >
              {failed ? text.actionFailed : text.bundleUnavailable}
            </h1>
          </div>
          {failed ? (
            <Button
              variant="tertiary"
              size="md"
              onClick={() => {
                focusTitleAfterRetry.current = true;
                void (profile.isError ? profile.refetch() : retryViewer());
              }}
            >
              {text.retry}
            </Button>
          ) : null}
        </div>
      </PageShell>
    );
  }
  // 덮개가 헤더까지 덮고 초점을 가져감(앱 공통)
  if (!member) {
    return (
      <PageShell header={header}>
        <p role="status" className="sr-only">
          {text.memberLoading}
        </p>
        <PageLoading />
      </PageShell>
    );
  }

  // 현재 번치 기준 상태라 소속 번치가 없으면 모두 「팔로우」
  const statusOf = (bunch: FeedMemberBunch): FeedFollowStatus =>
    viewer === null ? 'none' : bunch.followStatus;

  // 확인 없이 보내고, 성공하면 안내하고 다시 받음(실패 안내는 번치 쪽 기능, 실패해도 다시 받아 맞춤)
  // 다시 받기가 끝날 때까지 같은 번치는 다시 보내지 않음(버튼이 서버 값으로 바뀌기 전 다시 눌러 같은 요청이 가지 않게)
  const toggle = (bunch: FeedMemberBunch) =>
    asBunch(() => {
      if (sending.has(bunch.id)) return;
      const status = statusOf(bunch);
      setSending((current) => new Set(current).add(bunch.id));
      setAnnouncement('');
      void follow(
        bunch.id,
        status === 'none' ? { kind: 'follow' } : { kind: 'unfollow', followId: bunch.followId },
      )
        .then(
          (result) => {
            if (result === 'REQUESTED') setAnnouncement(text.followRequested(bunch.name));
            const message = followToast(bunch, status, result);
            if (message) toast(message);
          },
          () => undefined,
        )
        .then(refreshProfile)
        .finally(() => {
          setSending((current) => {
            const next = new Set(current);
            next.delete(bunch.id);
            return next;
          });
        });
    });

  return (
    <PageShell header={header}>
      <div className="gap-s7 pt-padding-p5 px-padding-p8 flex flex-col items-center">
        <ProfileImage
          size="L"
          src={member.imageSrc}
          alt=""
          className="border-border-tertiary border"
        />
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="typography-body-1-semi-bold text-text-primary text-center wrap-break-word break-keep"
        >
          {member.name}
        </h1>
      </div>
      {member.bunches.length > 0 ? (
        <section className="gap-s5 pt-padding-p15 px-padding-p8 pb-s8 flex flex-col">
          <h2 className="typography-body-4-semi-bold text-text-quaternary">
            {text.memberBunchesTitle}
          </h2>
          <ul className="gap-s4 flex flex-col">
            {sortMemberBunches(member.bunches).map((bunch) => {
              const own = viewer?.bunchId === bunch.id;
              const status = statusOf(bunch);
              const label = text.followLabels[status];
              return (
                <li key={bunch.id}>
                  <FollowListItem
                    name={bunch.name}
                    imageSrc={bunch.imageSrc}
                    isPrivate={bunch.isPrivate}
                    privateLabel={text.privateBunch}
                    onProfileClick={() =>
                      router.push(own ? links.bunchHome : links.otherBunch(bunch.id))
                    }
                    action={
                      // 현재 번치 자신의 줄에는 버튼 없음(서버의 showFollowButton, 소속 번치가 없으면 「팔로우」만)
                      own || (viewer && bunch.showFollowButton === false) ? undefined : (
                        <Button
                          size="sm"
                          variant={status === 'none' ? 'primary' : 'secondarySubtle'}
                          aria-label={`${bunch.name} ${label}${text.followActions[status]}`}
                          // 보내는 중(누르면 무시됨)임을 알림, 초점을 잃지 않게 disabled는 쓰지 않음
                          aria-busy={sending.has(bunch.id) || undefined}
                          onClick={() => toggle(bunch)}
                        >
                          {label}
                        </Button>
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </PageShell>
  );
}
