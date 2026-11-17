'use client';

import type { ReactNode, RefObject } from 'react';
import { Header, LineChevronLeftLargeIcon, LineDotsLargeIcon } from '@app/design-system';
import {
  BundleAuthorInfo,
  BundleEngagement,
  BundleInfo,
  BundlePhoto,
  CommentComposer,
} from '@app/design-system/web';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import type { FeedBundleDetail, FeedComment } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { bundleHeroKey } from '../../constants/paths';
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen';
import { hideLeftMemberImages } from '../../lib/deletedUserImage';
import { BundleCommentList, type BundleCommentThread } from './BundleCommentList';
import { BundleDetailStatus, type BundleDetailStatusProps } from './BundleDetailStatus';
import { MemberComments } from './MemberComments';

const COMMENT_MAX_LENGTH = 200;

/** 뒤로 버튼이 있는 상세 헤더(본문·안내 화면 공통) */
function BundleDetailHeader({ onBack, trailing }: { onBack: () => void; trailing?: ReactNode }) {
  return (
    <Header
      leading={
        <HeaderIconButton label={text.back} onClick={onBack}>
          <LineChevronLeftLargeIcon />
        </HeaderIconButton>
      }
      trailing={trailing}
    />
  );
}

type BundleDetailBodyProps = {
  bundle: FeedBundleDetail;
  /** 게시 경과 시간(클라이언트 시각을 받기 전에는 빈 문자열) */
  time: string;
  commentCount: number;
  thread: BundleCommentThread;
  /** 번들을 지우는 중(덮개와 안내) */
  removing: boolean;
  /** 소속 번치가 없음: 답글·신고를 눌렀을 때 안내하도록 버튼을 둠 */
  noBunch: boolean;
  /** 댓글 영역·입력란(container가 스크롤·초점을 옮김) */
  commentsRef: RefObject<HTMLElement | null>;
  composerRef: RefObject<HTMLDivElement | null>;
  composer: {
    value: string;
    onValueChange: (_value: string) => void;
    onSubmit: (_value: string) => void;
    placeholder: string;
    /** 답글 대상 작성자, 답글이 아니면 null */
    replyAuthor: string | null;
    onCancelReply: () => void;
  };
  /** 댓글 등록·삭제 결과를 읽어 줄 문구 */
  announcement: string;
  actions: {
    /** 헤더 더보기, 권한이 없으면 undefined(버튼 없음) */
    more: (() => void) | undefined;
    openBunch: () => void;
    openMembers: () => void;
    openPlaces: () => void;
    like: () => void;
    goToComments: () => void;
    reply: (_comment: FeedComment) => void;
    myCommentMore: (_comment: FeedComment) => void;
    reportMore: (_comment: FeedComment) => void;
  };
};

// 안내와 본문이 같은 PageShell을 이어 써 받는 중 → 본문에서 헤더·스크롤 영역이 다시 생기지 않음
type BundleDetailScreenProps = { onBack: () => void } & (
  | { status: BundleDetailStatusProps }
  | ({ status?: undefined } & BundleDetailBodyProps)
);

/**
 * 번들 상세 화면(Figma `5367:103510`·`5367:103541`): 번치 정보 → 제목·위치·날짜 → 사진 → 멤버별 코멘트 → 좋아요·댓글 수 → 댓글 목록, 아래 고정 입력란
 * 데이터와 동작은 `BundleDetail`이 넘기고, 그릴 수 없으면 `status` 안내
 */
export function BundleDetailScreen(props: BundleDetailScreenProps) {
  const keyboardOpen = useKeyboardOpen();
  if (props.status) {
    return (
      <PageShell header={<BundleDetailHeader onBack={props.onBack} />}>
        <BundleDetailStatus {...props.status} />
      </PageShell>
    );
  }
  const {
    onBack,
    bundle,
    time,
    commentCount,
    thread,
    removing,
    noBunch,
    commentsRef,
    composerRef,
    composer,
    announcement,
    actions,
  } = props;
  const { replyAuthor, onCancelReply, ...composerProps } = composer;

  return (
    <PageShell
      header={
        <BundleDetailHeader
          onBack={onBack}
          trailing={
            actions.more ? (
              <HeaderIconButton label={text.bundleMore} onClick={actions.more}>
                <LineDotsLargeIcon />
              </HeaderIconButton>
            ) : undefined
          }
        />
      }
      bottom={
        <div ref={composerRef} data-keyboard-open={keyboardOpen ? '' : undefined}>
          {replyAuthor !== null ? (
            <CommentComposer
              {...composerProps}
              maxLength={COMMENT_MAX_LENGTH}
              replyTarget={replyAuthor}
              onCancelReply={onCancelReply}
            />
          ) : (
            <CommentComposer {...composerProps} maxLength={COMMENT_MAX_LENGTH} />
          )}
        </div>
      }
    >
      {/* 지우는 동안과 지운 뒤 떠날 때까지 덮개(받는 중과 같은 모양)와 안내. 실패하면 걷히고 보던 화면 그대로 */}
      {removing ? (
        <>
          <p role="status" className="sr-only">
            {text.bundleDeleting}
          </p>
          <PageLoading />
        </>
      ) : null}
      <BundleAuthorInfo
        bunchName={bundle.bunch.name}
        imageSrc={bundle.bunch.imageSrc}
        time={time}
        onBunchClick={actions.openBunch}
        members={hideLeftMemberImages(bundle.members)}
        onMembers={actions.openMembers}
        className="px-padding-p8 py-s4"
      />
      <BundleInfo
        title={bundle.title}
        titleAs="h1"
        location={bundle.location}
        onLocationClick={actions.openPlaces}
        date={bundle.date}
        memberOnly={bundle.memberOnly}
        className="pt-padding-p8 pb-padding-p5 px-padding-p8"
      />
      {/* 피드 카드 사진이 이 첫 사진 자리로 옮겨 옴(AppTransitions의 피드 → 상세 hero) */}
      <BundlePhoto variant="detail" photos={bundle.photos} heroKey={bundleHeroKey(bundle.id)} />
      <MemberComments members={bundle.memberComments} />
      <BundleEngagement
        liked={bundle.liked}
        likeCount={bundle.likeCount}
        onLike={actions.like}
        commentCount={commentCount}
        onComment={actions.goToComments}
        className="pb-padding-p8 pt-6"
      />
      <div aria-hidden="true" className="bg-surface-secondary h-2" />
      <BundleCommentList
        thread={thread}
        sectionRef={commentsRef}
        announcement={announcement}
        noBunch={noBunch}
        onReply={actions.reply}
        onMyCommentMore={actions.myCommentMore}
        onReportMore={actions.reportMore}
      />
    </PageShell>
  );
}
