'use client';

import {
  ConfirmDialog,
  Header,
  LineChevronLeftLargeIcon,
  LineTrashcanMediumIcon,
  toast,
} from '@app/design-system';
import {
  BundleAuthorInfo,
  BundleEngagement,
  BundleInfo,
  BundlePhoto,
  CommentComposer,
  CommentItem,
  MoreMenuSheet,
} from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { FeedComment } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { getBundleDetailFixture } from '../../fixtures/bundleDetail.fixture';
import { useBundleSheets } from '../../hooks/useBundleSheets';
import { useClientNow } from '../../hooks/useClientNow';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { useHoldScrollOnLeave } from '../../hooks/useHoldScrollOnLeave';
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import {
  addComment,
  addReply,
  badgeColorOf,
  formatCommentDate,
  markDeleted,
} from '../../lib/comments';
import { DELETED_USER_IMAGE, hideLeftMemberImages } from '../../lib/deletedUserImage';
import { formatElapsedTime } from '../../lib/elapsedTime';
import { withRo } from '../../lib/josa';
import { MemberComments } from './MemberComments';

type BundleDetailScreenProps = {
  bundleId: string;
  /** 말풍선에서 들어옴(?focus=comments): 댓글 영역으로 스크롤하고 입력란 활성화 */
  focusComments: boolean;
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { bunchHome: string; otherBunch: (_bunchId: string) => string };
};

const COMMENT_MAX_LENGTH = 200;
const TOAST_OPTIONS = { position: 'top' } as const;

/**
 * 번들 상세(기능명세서 6.2, Figma `5367:103510`·`5367:103541`): 번치 정보 → 제목·위치·날짜 → 사진 → 멤버별 코멘트 → 좋아요·댓글 수 → 댓글 목록, 아래 고정 입력란
 * API 연결 전 fixture라 댓글 등록·삭제는 화면에서만 바뀜(구현 단위 10). 남의 댓글 신고(5), 번들 더보기(5·6)는 각 단위에서 추가
 */
export function BundleDetailScreen({ bundleId, focusComments, links }: BundleDetailScreenProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const now = useClientNow();
  // 입력란 높이가 변하고 키보드도 올라오므로 토스트는 헤더 아래
  const { viewer, asBunch } = useFeedViewer({ position: 'top' });
  const likes = useLikeToggle(viewer);
  const keyboardOpen = useKeyboardOpen();
  const commentsRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; author: string } | null>(null);
  const { openPlaces, openMembers } = useBundleSheets();
  const openOverlay = useScreenOverlay();
  const bundle = getBundleDetailFixture(bundleId);
  // ponytail: 화면 안에서만 바뀜. 댓글 API(구현 단위 10)를 연결하면 상세 query 캐시로 대체
  const [comments, setComments] = useState<readonly FeedComment[]>(bundle?.comments ?? []);
  const [addedCount, setAddedCount] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  // 같은 문구를 이어서 알려도 다시 읽히도록 끝에 보이지 않는 공백을 번갈아 붙임
  const announce = (message: string) =>
    setAnnouncement((current) => (current === message ? `${message}\u00a0` : message));
  // 등록·삭제가 반영된 뒤 초점을 옮길 댓글
  const focusCommentId = useRef<string | null>(null);

  useHoldScrollOnLeave(commentsRef);

  // 입력란은 CommentComposer 안쪽이라 감싼 요소에서 찾음
  const focusInput = useCallback(
    () => composerRef.current?.querySelector('textarea')?.focus({ preventScroll: true }),
    [],
  );

  const goToComments = useCallback(() => {
    commentsRef.current?.scrollIntoView({ block: 'start' });
    focusInput();
  }, [focusInput]);

  // 등록·삭제한 댓글로 초점을 옮김(키보드를 내리고 결과 자리를 알림)
  useEffect(() => {
    const id = focusCommentId.current;
    if (!id) return;
    focusCommentId.current = null;
    const item = document.getElementById(`comment-${id}`);
    item?.scrollIntoView?.({ block: 'nearest' });
    item?.focus({ preventScroll: true });
  }, [comments]);

  useEffect(() => {
    if (!focusComments) return;
    // effect에서 바로 주면 RouteFocus가 이동 전에 남은 초점으로 보고 제목으로 옮기므로 다음 프레임에
    const frame = requestAnimationFrame(goToComments);
    return () => cancelAnimationFrame(frame);
  }, [focusComments, goToComments]);

  const header = (
    <Header
      leading={
        <HeaderIconButton label={text.back} onClick={() => backOr(FEED_PATHS.home)}>
          <LineChevronLeftLargeIcon />
        </HeaderIconButton>
      }
    />
  );

  // API 연결 전 임시 안내. 연결하면 없는 ID는 route에서 notFound()(routing-and-access.md), 볼 수 없는 번들만 이 안내
  if (!bundle) {
    return (
      <PageShell header={header}>
        <h1 className="typography-body-2-regular text-text-quinary flex h-full items-center justify-center">
          {text.bundleUnavailable}
        </h1>
      </PageShell>
    );
  }

  const bunchRo = viewer ? withRo(viewer.name) : null;
  const placeholder = replyTarget
    ? bunchRo
      ? text.replyPlaceholderAs(bunchRo)
      : text.replyPlaceholder
    : bunchRo
      ? text.commentPlaceholderAs(bunchRo)
      : text.commentPlaceholder;
  const submit = (value: string) =>
    asBunch(() => {
      const content = value.trim();
      // 보내면 입력란을 바로 비워 보내기가 꺼지므로 연타해도 한 번만 등록됨
      if (!viewer || !content) return;
      const time = Date.now();
      const comment: FeedComment = {
        id: `local-${time}`,
        author: viewer.memberName ?? text.me,
        avatarSrc: viewer.memberImageSrc,
        bunchName: viewer.name,
        bunchColor: badgeColorOf(viewer.characterType),
        date: formatCommentDate(time),
        content,
        mine: true,
        ...(replyTarget && { reply: true, parentId: replyTarget.id }),
      };
      const next = replyTarget
        ? addReply(comments, replyTarget.id, comment)
        : addComment(comments, comment);
      // 원댓글을 못 찾으면(이미 사라짐) 등록하지 않음
      if (next === comments) return;
      setComments(next);
      setAddedCount((count) => count + 1);
      setDraft('');
      setReplyTarget(null);
      announce(replyTarget ? text.replyAdded : text.commentAdded);
      focusCommentId.current = comment.id;
    });

  const openDeleteConfirm = (comment: FeedComment) => {
    let confirmed = false;
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={text.deleteCommentTitle}
          description={text.deleteCommentDescription}
          cancelLabel={text.cancel}
          confirmLabel={text.deleteComment}
          onConfirm={() => {
            confirmed = true;
            close();
          }}
        />
      ),
      // 창이 다 닫힌 뒤 지우고 알려 토스트가 창 뒤에 묻히지 않게 함. 더보기가 사라지므로 그 댓글로 초점
      () => {
        if (!confirmed) return;
        setComments((current) => markDeleted(current, comment.id, text.leftMember));
        // 삭제된 댓글에는 답글을 달 수 없으므로 그 댓글에 쓰던 답글 상태를 풂
        setReplyTarget((target) => (target?.id === comment.id ? null : target));
        focusCommentId.current = comment.id;
        toast(text.commentDeleted, TOAST_OPTIONS);
      },
    );
  };

  // 내 댓글 더보기(Figma `5367:121393`): 「삭제」/「취소」. 시트가 다 닫힌 뒤 확인 창(`5367:121647`)
  const openCommentMenu = (comment: FeedComment) => {
    let chosen = false;
    openOverlay(
      (rootProps, close) => (
        <MoreMenuSheet
          {...rootProps}
          title={text.commentMenuTitle}
          cancelLabel={text.cancel}
          items={[
            {
              id: 'delete',
              label: text.deleteComment,
              tone: 'danger',
              leftIcon: <LineTrashcanMediumIcon aria-hidden />,
              onSelect: () => {
                chosen = true;
                close();
              },
            },
          ]}
        />
      ),
      () => {
        if (chosen) openDeleteConfirm(comment);
      },
    );
  };

  const composerProps = {
    value: draft,
    onValueChange: setDraft,
    onSubmit: submit,
    placeholder,
    maxLength: COMMENT_MAX_LENGTH,
  };

  return (
    <PageShell
      header={header}
      bottom={
        <div ref={composerRef} data-keyboard-open={keyboardOpen ? '' : undefined}>
          {replyTarget ? (
            <CommentComposer
              {...composerProps}
              replyTarget={replyTarget.author}
              // 닫기 버튼이 사라지므로 초점을 입력란으로
              onCancelReply={() => {
                setReplyTarget(null);
                focusInput();
              }}
            />
          ) : (
            <CommentComposer {...composerProps} />
          )}
        </div>
      }
    >
      <BundleAuthorInfo
        bunchName={bundle.bunch.name}
        imageSrc={bundle.bunch.imageSrc}
        time={now === null ? '' : formatElapsedTime(bundle.publishedAt, now)}
        onBunchClick={() =>
          router.push(
            viewer?.bunchId === bundle.bunch.id
              ? links.bunchHome
              : links.otherBunch(bundle.bunch.id),
          )
        }
        members={hideLeftMemberImages(bundle.members)}
        onMembers={() => openMembers(bundle.members)}
        className="px-padding-p8 py-s4"
      />
      <BundleInfo
        title={bundle.title}
        titleAs="h1"
        location={bundle.location}
        onLocationClick={() => openPlaces(bundle.places)}
        date={bundle.date}
        memberOnly={bundle.memberOnly}
        className="pt-padding-p8 pb-padding-p5 px-padding-p8"
      />
      <BundlePhoto variant="detail" photos={bundle.photos} />
      <MemberComments members={bundle.memberComments} />
      <BundleEngagement
        liked={likes.isLiked(bundle)}
        likeCount={likes.likeCount(bundle)}
        onLike={() => asBunch(() => likes.toggle(bundle))}
        commentCount={bundle.commentCount + addedCount}
        onComment={goToComments}
        className="pb-padding-p8 pt-6"
      />
      <div aria-hidden="true" className="bg-surface-secondary h-2" />
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <section ref={commentsRef} aria-label={text.commentsTitle}>
        {comments.length > 0 ? (
          <ul className="px-padding-p8 pt-padding-p8">
            {comments.map((comment) => (
              <li
                key={comment.id}
                id={`comment-${comment.id}`}
                tabIndex={-1}
                // 등록·삭제 뒤 초점이 오면 어떤 댓글인지 읽히게 이름을 붙임
                aria-label={
                  comment.deleted ? text.deletedCommentLabel : text.commentLabel(comment.author)
                }
                className="focus-visible:outline-border-brand rounded-r4 focus-visible:outline-2"
              >
                <CommentItem
                  author={comment.author}
                  avatarSrc={comment.deleted ? DELETED_USER_IMAGE : comment.avatarSrc}
                  bunchName={comment.bunchName}
                  bunchColor={comment.bunchColor}
                  date={comment.date}
                  content={comment.content}
                  reply={comment.reply}
                  deleted={comment.deleted}
                  replyCount={comment.replyCount}
                  // 삭제된 댓글에는 답글을 달 수 없음
                  onReply={
                    comment.deleted
                      ? undefined
                      : () =>
                          asBunch(() => {
                            setReplyTarget({ id: comment.id, author: comment.author });
                            focusInput();
                          })
                  }
                  // 내 댓글만 삭제 메뉴(남의 댓글 신고는 구현 단위 5)
                  onMore={
                    comment.mine && !comment.deleted ? () => openCommentMenu(comment) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="typography-body-2-regular text-text-quinary flex h-64 items-center justify-center">
            {text.noComments}
          </p>
        )}
      </section>
    </PageShell>
  );
}
