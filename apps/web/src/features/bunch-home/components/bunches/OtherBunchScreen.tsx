'use client';

import { cn, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { FollowButton } from '@app/design-system/web';
import { type ReactNode, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { defaultBunchImage } from '@/shared/lib/bunchProfile';
import type { FollowStatus } from '../../lib/types';
import type { OtherBunchProfile } from '../../model/otherBunch';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_BACKGROUNDS } from '../../lib/bunchTheme';
import { BunchProfile } from '../BunchProfile';
import { BunchProfileImage } from '../BunchProfileImage';
import { CompletedBundleGrid } from '../CompletedBundleGrid';
import { PrivateBunchNotice } from '../PrivateBunchNotice';
import { FollowCancelSheet } from './FollowCancelSheet';

type OtherBunchScreenProps = {
  bunch: OtherBunchProfile;
  /** 지금 내 번치 명의의 팔로우 상태 */
  status: FollowStatus;
  /** 번들을 가리는지(비공개이고 팔로우 승인 전, 서버 판단) */
  locked: boolean;
  onBack: () => void;
  /** 헤더 알림 옆 더보기(차단·신고) */
  more?: ReactNode;
  /** 팔로우·요청. 끝나면 결과를 알리고, 실패하면 reject(안내는 부르는 쪽) */
  onFollow: () => Promise<unknown>;
  /** 언팔로우·팔로우 요청 취소 */
  onUnfollow: () => Promise<unknown>;
  /** 처리 중(버튼을 다시 눌러도 보내지 않음) */
  busy?: boolean;
  /** 팔로우할 수 있는지(내 번치가 없으면 버튼 없음) */
  canFollow?: boolean;
};

/**
 * 다른 번치 프로필(기능명세 5.10, 화면설계서 2500:68583, Figma 3086:68423·68534·68654·68758)
 * 공개 번치와 팔로우 중인 비공개 번치는 번들, 나머지 비공개 번치는 가림 안내
 * 「팔로잉」·「팔로우 요청됨」은 확인 시트로 취소(3·4번)
 */
export function OtherBunchScreen({
  bunch,
  status,
  locked,
  onBack,
  more,
  onFollow,
  onUnfollow,
  busy = false,
  canFollow = true,
}: OtherBunchScreenProps) {
  const openOverlay = useScreenOverlay();
  const background = BUNCH_BACKGROUNDS[bunch.characterType];
  // 버튼 이름만 바뀌면 스크린 리더가 결과를 놓칠 수 있어 상태 영역으로도 알림(서버 반영 뒤)
  const [announcement, setAnnouncement] = useState('');
  // 같은 문구가 이어져도 다시 낭독되게 시작할 때 비움
  const follow = () => {
    setAnnouncement('');
    return onFollow().then(
      () =>
        setAnnouncement(
          bunch.isPrivate
            ? BUNCH_HOME_MESSAGES.followRequested(bunch.name)
            : BUNCH_HOME_MESSAGES.followed(bunch.name),
        ),
      () => {},
    );
  };

  // 시트를 연 때의 상태로 그려 취소한 뒤 닫히는 동안 문구가 바뀌지 않음
  const openCancelSheet = (sheetFor: FollowStatus) =>
    openOverlay((rootProps, close) => (
      <FollowCancelSheet
        {...rootProps}
        bunchName={bunch.name}
        bunchImageSrc={bunch.imageSrc ?? defaultBunchImage(bunch.characterType)}
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
          close();
          setAnnouncement('');
          void onUnfollow().then(
            () =>
              setAnnouncement(
                sheetFor === 'requested'
                  ? BUNCH_HOME_MESSAGES.requestCanceled(bunch.name)
                  : BUNCH_HOME_MESSAGES.unfollowed(bunch.name),
              ),
            () => {},
          );
        }}
      />
    ));

  return (
    <PageShell
      data-app-background={background.app}
      data-app-background-bottom="primary"
      className={cn('to-surface-primary bg-linear-to-b from-50% to-50%', background.frame)}
      header={
        <Header
          className={background.top}
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={onBack}>
              <LineChevronLeftLargeIcon />
            </HeaderIconButton>
          }
          trailing={more}
        />
      }
    >
      <div className="flex min-h-full flex-col">
        {/* 번치 홈과 같은 성격별 배경·프로필 이미지 영역과 흰 시트(Figma 3086:70741) */}
        <div className={cn('relative h-25.5 shrink-0', background.top)}>
          <BunchProfileImage imageSrc={bunch.imageSrc} characterType={bunch.characterType} />
        </div>
        <div className="bg-surface-primary rounded-t-r10 pt-padding-p16 gap-s8 pb-s8 relative -mt-5 flex flex-1 flex-col">
          {/* 프로필 아래 팔로우 버튼 16, 버튼 아래 번들·안내 16(Figma 3086:68423) */}
          <div className="gap-s8 flex flex-col">
            {/* 수는 글자만(멤버·팔로워·팔로잉 목록의 서버 연결 때 링크로) */}
            <BunchProfile bunch={bunch} showPlaces={false} />
            {canFollow && (
              <div className="px-padding-p8">
                <FollowButton
                  status={status === 'none' ? 'follow' : status}
                  // 처리 중은 흐리게(비활성 회색은 상태가 바뀐 것처럼 보여 쓰지 않음)
                  className={cn('w-full transition-opacity', busy && 'opacity-60')}
                  aria-haspopup={status === 'none' ? undefined : 'dialog'}
                  aria-busy={busy || undefined}
                  onClick={() => {
                    if (busy) return;
                    if (status === 'none') return void follow();
                    openCancelSheet(status);
                  }}
                />
              </div>
            )}
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
    </PageShell>
  );
}
