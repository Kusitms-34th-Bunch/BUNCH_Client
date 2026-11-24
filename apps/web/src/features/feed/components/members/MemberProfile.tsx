'use client';

import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { isUnavailableTarget } from '@/shared/api/client/errorStatus';
import { openTabPath } from '@/shared/bridge/client';
import { useBackOr } from '@/shared/hooks/useBackOr';
import type { FeedFollowStatus, FeedMemberBunch } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { memberBunchFollowStatus } from '../../lib/memberBunches';
import { memberProfileQueryOptions, useRefreshMemberProfile } from '../../queries/memberProfile';
import { MemberProfileScreen, type MemberProfileState } from './MemberProfileScreen';

/** 팔로우 바꾸기. 취소의 `followId`는 응답의 관계 ID */
export type MemberFollowChange =
  | { kind: 'follow' }
  | { kind: 'unfollow'; followId: string | undefined };

type MemberProfileProps = {
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
 * 멤버 프로필 화면과 멤버 조회·팔로우를 잇는 컨테이너
 * 멤버와 참여 번치·팔로우 상태는 서버(명세 020, 지금 번치 기준, 차단 관계 번치는 서버가 뺌). 팔로우는 번치 쪽 기능으로 보냄
 */
export function MemberProfile({ memberId, links, follow }: MemberProfileProps) {
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
  // 누른 「다시 시도」를 기억해, 받는 사이 사용자가 옮긴 초점(헤더의 뒤로 가기 등)은 빼앗지 않음
  const titleRef = useRef<HTMLHeadingElement>(null);
  const retryPressed = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // 받는 중(스켈레톤, 제목 없음)이면 다음 렌더까지 기다림
    const pressed = retryPressed.current;
    if (!pressed || profile.isFetching || viewerFetching) return;
    if (!titleRef.current) return;
    retryPressed.current = null;
    // body는 옮기지 않은 것으로 봄(누른 버튼이 사라졌거나, iOS Safari처럼 눌러도 버튼에 초점이 가지 않는 경우)
    const active = document.activeElement;
    const moved = active && active !== document.body && active !== pressed && active.isConnected;
    if (!moved) titleRef.current.focus({ preventScroll: true });
  });

  // 없음·탈퇴·볼 수 없음(404·403)과 잘못된 주소(400)는 같은 안내, 그 밖의 실패는 다시 시도
  // 받아 둔 프로필이 있어도 다시 받기가 실패하면 안내(옛 관계 상태로 다시 보내지 않게)
  const unavailable = isUnavailableTarget(profile.error);
  const failed =
    !unavailable && (profile.isError || (!member && viewer === undefined && viewerFailed));
  const state: MemberProfileState = unavailable
    ? 'unavailable'
    : failed
      ? 'failed'
      : member
        ? 'ready'
        : 'loading';

  const statusOf = (bunch: FeedMemberBunch) => memberBunchFollowStatus(viewer, bunch);

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
    <MemberProfileScreen
      state={state}
      member={member}
      viewer={viewer}
      sending={sending}
      announcement={announcement}
      titleRef={titleRef}
      onBack={() => backOr(FEED_PATHS.home)}
      onRetry={(pressed) => {
        retryPressed.current = pressed;
        void (profile.isError ? profile.refetch() : retryViewer());
      }}
      // 내 번치는 번치 탭 첫 화면이라 iOS 쉘에서는 번치 탭으로 전환
      onOpenBunch={(bunch) =>
        viewer?.bunchId === bunch.id
          ? openTabPath(links.bunchHome, (href) => router.push(href))
          : router.push(links.otherBunch(bunch.id))
      }
      onToggleFollow={toggle}
    />
  );
}
