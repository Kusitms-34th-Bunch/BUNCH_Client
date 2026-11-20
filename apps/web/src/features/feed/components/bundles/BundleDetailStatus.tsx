'use client';

import type { RefObject } from 'react';
import { Button } from '@app/design-system';
import { BundleAuthorInfo, BundleInfo, BundlePhoto } from '@app/design-system/web';
import type { FeedBundle } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { bundleHeroKey } from '../../constants/paths';
import { hideLeftMemberImages } from '../../lib/deletedUserImage';
import { BundleDetailRestSkeleton, BundleDetailSkeleton } from './BundleDetailSkeleton';

export type BundleDetailStatusProps = {
  kind: 'loading' | 'unavailable' | 'failed';
  /** 볼 수 없음·실패 안내의 제목(다시 시도 뒤 초점을 받는 곳) */
  titleRef: RefObject<HTMLHeadingElement | null>;
  onRetry: () => void;
  /** 받는 중일 때 먼저 그릴 피드 카드 데이터와 게시 경과 시간(피드에서 연 경우) */
  preview?: { bundle: FeedBundle; time: string } | undefined;
};

const noop = () => {};

/** 번들 상세 본문을 그릴 수 없을 때: 받는 중 스켈레톤, 볼 수 없음 안내, 실패와 다시 시도 */
export function BundleDetailStatus({ kind, titleRef, onRetry, preview }: BundleDetailStatusProps) {
  // 피드에서 왔으면 본문과 같은 자리에 번치·제목·첫 사진을 먼저 그리고 그 아래만 스켈레톤(카드 사진이 hero로 이어짐). 받기 전이라 누를 수 없게 inert
  if (kind === 'loading' && preview) {
    const { bundle, time } = preview;
    return (
      <>
        <p role="status" className="sr-only">
          {text.bundleLoading}
        </p>
        {/* 제목도 inert 안: 화면 진입 초점(RouteFocus)이 건너뛰고 본문 제목이 생기면 그쪽으로 감(미리 그린 제목에 주면 바뀔 때 초점이 사라짐) */}
        <div inert>
          <BundleAuthorInfo
            bunchName={bundle.bunch.name}
            imageSrc={bundle.bunch.imageSrc}
            time={time}
            onBunchClick={noop}
            members={hideLeftMemberImages(bundle.members)}
            onMembers={noop}
            className="px-padding-p8 py-s4"
          />
          <BundleInfo
            title={bundle.title}
            titleAs="h1"
            location={bundle.location}
            onLocationClick={noop}
            date={bundle.date}
            className="pt-padding-p8 pb-padding-p5 px-padding-p8"
          />
          <BundlePhoto variant="detail" photos={bundle.photos} heroKey={bundleHeroKey(bundle.id)} />
        </div>
        <BundleDetailRestSkeleton />
      </>
    );
  }
  // 가진 데이터 없이 들어왔으면(알림·공유 링크) 본문 전체 스켈레톤. 헤더(뒤로 가기)는 실제라 바로 누를 수 있음
  if (kind === 'loading') {
    return (
      <>
        <p role="status" className="sr-only">
          {text.bundleLoading}
        </p>
        <BundleDetailSkeleton />
      </>
    );
  }
  const failed = kind === 'failed';
  return (
    <div className="gap-s8 flex h-full flex-col items-center justify-center">
      {/* 알림은 감싼 요소에 두어 h1의 제목 의미를 지킴 */}
      <div role={failed ? 'alert' : undefined}>
        <h1 ref={titleRef} className="typography-body-2-regular text-text-quinary text-center">
          {failed ? text.actionFailed : text.bundleUnavailable}
        </h1>
      </div>
      {failed ? (
        // 누르면 받는 중 화면(스켈레톤)으로 바뀜. 데이터 없이 실패한 query는 다시 받으면 pending
        <Button variant="tertiary" size="md" onClick={onRetry}>
          {text.retry}
        </Button>
      ) : null}
    </div>
  );
}
