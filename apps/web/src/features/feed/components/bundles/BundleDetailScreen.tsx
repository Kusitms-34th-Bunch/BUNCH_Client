'use client';

import type { ReactNode, RefObject } from 'react';
import { Header, LineDotsLargeIcon } from '@app/design-system';
import {
  BundleAuthorInfo,
  BundleEngagement,
  BundleInfo,
  BundlePhoto,
  CommentComposer,
} from '@app/design-system/web';
import { HeaderBackButton } from '@/shared/components/layout/HeaderBackButton';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { bundleHeroKey } from '@/shared/lib/navigation/heroKeys';
import type { FeedBundleDetail, FeedComment } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen';
import { usePhotoPinchZoom } from '../../hooks/usePhotoPinchZoom';
import { hideLeftMemberImages } from '../../lib/deletedUserImage';
import { BundleCommentList, type BundleCommentThread } from './BundleCommentList';
import { BundleCommentsSkeleton } from './BundleDetailSkeleton';
import { BundleDetailStatus, type BundleDetailStatusProps } from './BundleDetailStatus';
import { MemberComments } from './MemberComments';

const COMMENT_MAX_LENGTH = 200;

/** 뒤로 버튼이 있는 상세 헤더(본문·안내 화면 공통) */
function BundleDetailHeader({ onBack, trailing }: { onBack: () => void; trailing?: ReactNode }) {
  return <Header leading={<HeaderBackButton onClick={onBack} />} trailing={trailing} />;
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
  /** 댓글 목록을 아직 그리지 않음(들어오는 전환 중, 그동안 자리만 스켈레톤) */
  commentsDeferred: boolean;
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
    openProfile: (_memberId: string) => void;
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
  const photosRef = usePhotoPinchZoom();
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
    commentsDeferred,
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
        <div
          ref={composerRef}
          data-keyboard-open={keyboardOpen ? '' : undefined}
          // 닫기 버튼이 사라진 뒤 초점을 받는 자리(입력란에 주면 키보드가 올라옴), 초점이 오면 이름을 읽음
          tabIndex={-1}
          // 화면 아래에 따로 붙어 main 밖이라 영역(landmark)으로 둠(axe region)
          role="region"
          aria-label={text.composerGroup}
          className="outline-none"
          // 입력란 밖을 눌러 키보드가 닫히면 답글 상태도 닫음(쓴 글이 있으면 일반 댓글로 바뀌지 않게 둠)
          onBlur={(event) => {
            if (replyAuthor === null || composerProps.value.trim() !== '') return;
            const area = event.currentTarget;
            // iOS는 버튼을 눌러도 초점을 주지 않아 X를 누를 때도 blur가 먼저 옴: 클릭이 끝난 뒤 초점 자리로 판단
            // 앱 전환(창이 초점을 잃음)은 입력란 밖을 누른 것이 아니라 닫지 않음
            setTimeout(() => {
              if (!document.hasFocus() || area.contains(document.activeElement)) return;
              onCancelReply();
            });
          }}
        >
          {replyAuthor !== null ? (
            <CommentComposer
              {...composerProps}
              maxLength={COMMENT_MAX_LENGTH}
              replyTarget={replyAuthor}
              onCancelReply={() => {
                onCancelReply();
                composerRef.current?.focus({ preventScroll: true });
              }}
            />
          ) : (
            <CommentComposer {...composerProps} maxLength={COMMENT_MAX_LENGTH} />
          )}
        </div>
      }
    >
      {/* 지우는 동안과 지운 뒤 떠날 때까지 덮개(`PageLoading`)와 안내. 실패하면 걷히고 보던 화면 그대로 */}
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
      {/* 사진만 두 손가락으로 확대(usePhotoPinchZoom) */}
      <div ref={photosRef}>
        <BundlePhoto variant="detail" photos={bundle.photos} heroKey={bundleHeroKey(bundle.id)} />
      </div>
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
      {commentsDeferred ? (
        // 댓글 영역 ref로 화면(main·전환 틀)을 찾는 처리(떠날 때 스크롤 붙잡기·번치 drill)가 그대로 동작하게 자리에 붙임
        <div ref={commentsRef as RefObject<HTMLDivElement | null>}>
          <BundleCommentsSkeleton />
        </div>
      ) : (
        <BundleCommentList
          thread={thread}
          sectionRef={commentsRef}
          announcement={announcement}
          noBunch={noBunch}
          onReply={actions.reply}
          onMyCommentMore={actions.myCommentMore}
          onReportMore={actions.reportMore}
          onOpenProfile={actions.openProfile}
        />
      )}
    </PageShell>
  );
}
