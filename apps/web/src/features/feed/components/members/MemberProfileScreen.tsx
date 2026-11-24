'use client';

import type { RefObject } from 'react';
import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { FollowListItem, ProfileImage } from '@app/design-system/web';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { FeedMemberBunch, FeedMemberProfile, FeedViewer } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { memberBunchFollowStatus, sortMemberBunches } from '../../lib/memberBunches';
import { MemberProfileSkeleton } from './MemberProfileSkeleton';

/** 볼 수 없음 안내, 다시 시도 안내, 받는 중, 프로필 */
export type MemberProfileState = 'unavailable' | 'failed' | 'loading' | 'ready';

type MemberProfileScreenProps = {
  state: MemberProfileState;
  member: FeedMemberProfile | undefined;
  /** 지금 번치(받기 전 undefined, 소속 번치 없음 null) */
  viewer: FeedViewer | null | undefined;
  /** 팔로우를 보내는 중인 번치 */
  sending: ReadonlySet<string>;
  /** 비공개 번치 요청 결과(스크린 리더 전용) */
  announcement: string;
  /** 다시 시도 뒤 초점을 받을 제목(컨테이너가 초점을 옮김) */
  titleRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onRetry: (_pressed: HTMLElement) => void;
  onOpenBunch: (_bunch: FeedMemberBunch) => void;
  onToggleFollow: (_bunch: FeedMemberBunch) => void;
};

/** 멤버 프로필(기능명세서 6.3.3, Figma `5367:110380`): 프로필 이미지·닉네임, 참여중인 번치와 팔로우 */
export function MemberProfileScreen({
  state,
  member,
  viewer,
  sending,
  announcement,
  titleRef,
  onBack,
  onRetry,
  onOpenBunch,
  onToggleFollow,
}: MemberProfileScreenProps) {
  const header = (
    <Header
      leading={
        <HeaderIconButton label={text.back} onClick={onBack}>
          <LineChevronLeftLargeIcon />
        </HeaderIconButton>
      }
    />
  );

  const statusOf = (bunch: FeedMemberBunch) => memberBunchFollowStatus(viewer, bunch);

  if (state === 'unavailable' || state === 'failed') {
    const failed = state === 'failed';
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
            <Button variant="tertiary" size="md" onClick={(event) => onRetry(event.currentTarget)}>
              {text.retry}
            </Button>
          ) : null}
        </div>
      </PageShell>
    );
  }
  // 받는 중은 화면 모양만(뒤로 가기는 실제 헤더라 바로 누를 수 있음)
  if (state === 'loading' || !member) {
    return (
      <PageShell header={header}>
        <p role="status" className="sr-only">
          {text.memberLoading}
        </p>
        <MemberProfileSkeleton />
      </PageShell>
    );
  }

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
                    onProfileClick={() => onOpenBunch(bunch)}
                    action={
                      // 현재 번치 자신의 줄에는 버튼 없음(서버의 showFollowButton, 소속 번치가 없으면 「팔로우」만)
                      own || (viewer && bunch.showFollowButton === false) ? undefined : (
                        <Button
                          size="sm"
                          variant={status === 'none' ? 'primary' : 'secondarySubtle'}
                          aria-label={`${bunch.name} ${label}${text.followActions[status]}`}
                          // 보내는 중(누르면 무시됨)임을 알림, 초점을 잃지 않게 disabled는 쓰지 않음
                          aria-busy={sending.has(bunch.id) || undefined}
                          onClick={() => onToggleFollow(bunch)}
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
