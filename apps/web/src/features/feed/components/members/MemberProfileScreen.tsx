'use client';

import { Button, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { FollowListItem, ProfileImage } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import type { FeedFollowStatus, FeedMemberBunch } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { getMemberProfileFixture } from '../../fixtures/memberProfile.fixture';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { sortMemberBunches } from '../../lib/memberBunches';

type MemberProfileScreenProps = {
  memberId: string;
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { bunchHome: string; otherBunch: (_bunchId: string) => string };
};

const followToast = (bunch: FeedMemberBunch, status: FeedFollowStatus) => {
  if (status === 'following') return text.unfollowed(bunch.name);
  if (status === 'requested') return text.requestCanceled(bunch.name);
  return bunch.isPrivate ? text.followRequested(bunch.name) : text.followed(bunch.name);
};

/**
 * 멤버 프로필(기능명세서 6.3.3, Figma `5367:110380`): 프로필 이미지·닉네임, 참여중인 번치와 팔로우
 * API 연결 전 fixture라 팔로우는 화면에서만 바뀜. 차단 관계인 번치는 서버가 뺌(구현 단위 10)
 */
export function MemberProfileScreen({ memberId, links }: MemberProfileScreenProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const { viewer, viewerPending, asBunch } = useFeedViewer();
  const [followed, setFollowed] = useState<Record<string, FeedFollowStatus>>({});
  const member = getMemberProfileFixture(memberId);

  const header = (
    <Header
      leading={
        <HeaderIconButton label={text.back} onClick={() => backOr(FEED_PATHS.home)}>
          <LineChevronLeftLargeIcon />
        </HeaderIconButton>
      }
    />
  );

  // API 연결 전 임시 안내. 연결하면 없는 ID는 route에서 notFound()(routing-and-access.md)
  if (!member) {
    return (
      <PageShell header={header}>
        <h1 className="typography-body-2-regular text-text-quinary flex h-full items-center justify-center">
          {text.bundleUnavailable}
        </h1>
      </PageShell>
    );
  }

  // 현재 번치 기준 상태라 소속 번치가 없으면 모두 「팔로우」
  const statusOf = (bunch: FeedMemberBunch): FeedFollowStatus =>
    viewer === null ? 'none' : (followed[bunch.id] ?? bunch.followStatus);

  const toggle = (bunch: FeedMemberBunch) =>
    asBunch(() => {
      const status = statusOf(bunch);
      const next = status !== 'none' ? 'none' : bunch.isPrivate ? 'requested' : 'following';
      setFollowed((current) => ({ ...current, [bunch.id]: next }));
      toast(followToast(bunch, status));
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
        <h1 className="typography-body-1-semi-bold text-text-primary text-center wrap-break-word break-keep">
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
                    // 받는 중에는 내 번치 줄을 알 수 없어 이동과 버튼을 막음
                    onProfileClick={
                      viewerPending
                        ? undefined
                        : () => router.push(own ? links.bunchHome : links.otherBunch(bunch.id))
                    }
                    action={
                      // 현재 번치 자신의 줄에는 버튼 없음
                      own || viewerPending ? undefined : (
                        <Button
                          size="sm"
                          variant={status === 'none' ? 'primary' : 'secondarySubtle'}
                          aria-label={`${bunch.name} ${label}${text.followActions[status]}`}
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
    </PageShell>
  );
}
