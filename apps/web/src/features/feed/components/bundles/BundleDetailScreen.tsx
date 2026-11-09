'use client';

import {
  ConfirmDialog,
  Header,
  LineAlertMediumIcon,
  LineChevronLeftLargeIcon,
  LineDotsLargeIcon,
  LineLockMediumIcon,
  LinePencilMediumIcon,
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
  ReportSheet,
} from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { REPORT_OTHER, REPORT_REASONS } from '@/shared/lib/reportReasons';
import type { FeedComment } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { FEED_TOAST_OFFSET } from '../../constants/toast';
import { getBundleDetailFixture } from '../../fixtures/bundleDetail.fixture';
import { useBundleEdits } from '../../hooks/useBundleEdits';
import { useBundleSheets } from '../../hooks/useBundleSheets';
import { useClientNow } from '../../hooks/useClientNow';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { useHoldScrollOnLeave } from '../../hooks/useHoldScrollOnLeave';
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import { bundleEdits } from '../../lib/bundleEdits';
import {
  addComment,
  addReply,
  badgeColorOf,
  formatCommentDate,
  hideComment,
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
// Figma `6079:178315`: 토스트는 입력란 바로 위 12px, 좌우 16씩 띄운 폭
const TOAST_GAP = 12;
// Toaster의 기본 아래 여백(Safe Area + 16)
const TOAST_BASE_OFFSET = 16;

// 버튼 이름에 붙일 댓글 앞부분: 줄바꿈을 공백으로, 이모지가 반으로 잘리지 않게 글자 단위로 20자
const previewOf = (content = '') =>
  Array.from(content.replace(/\s+/g, ' ').trim()).slice(0, 20).join('');

// Toaster가 쓰는 하단 Safe Area(px). 키보드가 열리면 입력란은 Safe Area 없이 내려가지만 토스트 여백에는 남음
const safeAreaBottom = () => {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;height:var(--safe-area-bottom, env(safe-area-inset-bottom, 0px))';
  document.body.append(probe);
  const height = probe.offsetHeight;
  probe.remove();
  return height;
};

/**
 * 번들 상세(기능명세서 6.2, Figma `5367:103510`·`5367:103541`): 번치 정보 → 제목·위치·날짜 → 사진 → 멤버별 코멘트 → 좋아요·댓글 수 → 댓글 목록, 아래 고정 입력란
 * API 연결 전 fixture라 댓글·신고·번들 삭제·공개 범위는 화면에서만 바뀜(구현 단위 10). 「수정하기」는 메뉴만 있고 수정 화면이 생기면 이동을 붙임
 */
export function BundleDetailScreen({ bundleId, focusComments, links }: BundleDetailScreenProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const now = useClientNow();
  const composerRef = useRef<HTMLDivElement>(null);
  // 입력란 위치(답글 상태·줄 수·키보드)가 바뀌므로 토스트를 띄우는 순간 화면 아래에서의 거리로 잼
  const toastOptions = () => {
    const top = composerRef.current?.getBoundingClientRect().top;
    const fromBottom = top === undefined ? 0 : window.innerHeight - top;
    return {
      fullWidth: true,
      bottomOffset: Math.max(0, fromBottom + TOAST_GAP - TOAST_BASE_OFFSET - safeAreaBottom()),
    };
  };
  const { viewer, asBunch } = useFeedViewer(toastOptions);
  const likes = useLikeToggle(viewer);
  const keyboardOpen = useKeyboardOpen();
  const commentsRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; author: string } | null>(null);
  const { openPlaces, openMembers } = useBundleSheets();
  const openOverlay = useScreenOverlay();
  const { isDeleted, memberOnlyOf } = useBundleEdits();
  // 화면에서 지운 번들은 없는 번들과 같은 안내. 들어올 때 기준이라 여기서 지운 뒤 떠나는 동안 안내로 바뀌지 않음
  const [deletedOnEnter] = useState(() => isDeleted(bundleId));
  const bundle = deletedOnEnter ? undefined : getBundleDetailFixture(bundleId);
  // ponytail: 화면 안에서만 바뀜. 댓글 API(구현 단위 10)를 연결하면 상세 query 캐시로 대체
  const [comments, setComments] = useState<readonly FeedComment[]>(bundle?.comments ?? []);
  const [addedCount, setAddedCount] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  // 같은 문구를 이어서 알려도 다시 읽히도록 끝에 보이지 않는 공백을 번갈아 붙임
  const announce = (message: string) =>
    setAnnouncement((current) => (current === message ? `${message}\u00a0` : message));
  // 등록·삭제가 반영된 뒤 초점을 옮길 댓글
  const focusCommentId = useRef<string | null>(null);
  // 지운 결과(답글 상태 해제로 입력란 높이도 바뀜)가 그려진 뒤 띄울 토스트
  const pendingToast = useRef<string | null>(null);
  // 화면에서 등록한 댓글 ID(시각은 같은 밀리초에 겹칠 수 있어 순번을 씀)
  const localId = useRef(0);

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
    // 숨겨 사라진 댓글이면 댓글 영역으로
    const item = document.getElementById(`comment-${id}`) ?? commentsRef.current;
    item?.scrollIntoView?.({ block: 'nearest' });
    item?.focus({ preventScroll: true });
    const message = pendingToast.current;
    if (!message) return;
    pendingToast.current = null;
    toast(message, toastOptions());
  }, [comments]);

  useEffect(() => {
    if (!focusComments) return;
    // effect에서 바로 주면 RouteFocus가 이동 전에 남은 초점으로 보고 제목으로 옮기므로 다음 프레임에
    const frame = requestAnimationFrame(goToComments);
    return () => cancelAnimationFrame(frame);
  }, [focusComments, goToComments]);

  // 남의 댓글 신고: 접수되면 그 댓글(원댓글이면 답글까지)을 바로 숨기고 그 자리 다음 댓글로 초점
  // 시트가 닫힌 시점의 최신 목록으로 계산
  const hideReported = usePreservedCallback((comment: FeedComment) => {
    const { comments: next, hiddenCount: count } = hideComment(comments, comment.id);
    const index = comments.findIndex(({ id }) => id === comment.id);
    focusCommentId.current = next[index]?.id ?? next[index - 1]?.id ?? 'none';
    pendingToast.current = text.reported;
    setComments(next);
    setHiddenCount((value) => value + count);
    setReplyTarget((target) =>
      target && !next.some(({ id }) => id === target.id) ? null : target,
    );
  });

  const header = (trailing?: ReactNode) => (
    <Header
      leading={
        <HeaderIconButton label={text.back} onClick={() => backOr(FEED_PATHS.home)}>
          <LineChevronLeftLargeIcon />
        </HeaderIconButton>
      }
      trailing={trailing}
    />
  );

  // API 연결 전 임시 안내. 연결하면 없는 ID는 route에서 notFound()(routing-and-access.md), 볼 수 없는 번들만 이 안내
  if (!bundle) {
    return (
      <PageShell header={header()}>
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
        id: `local-${(localId.current += 1)}`,
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
        pendingToast.current = text.commentDeleted;
      },
    );
  };

  // 신고 사유 시트(Figma `5367:121909`·`5367:122444`, 번치 신고와 같은 구성). 접수되면 닫힌 뒤 onReported
  const openReport = (title: string, onReported: () => void) =>
    asBunch(() => {
      let reported = false;
      openOverlay(
        (rootProps, close) => (
          <ReportSheet
            {...rootProps}
            title={title}
            description={text.reportAs(viewer?.name ?? '')}
            reasons={REPORT_REASONS}
            detailReasonValue={REPORT_OTHER}
            onSubmit={() => {
              reported = true;
              close();
            }}
          />
        ),
        () => {
          if (reported) onReported();
        },
      );
    });

  const reportComment = (comment: FeedComment) =>
    openReport(text.reportCommentTitle, () => hideReported(comment));

  // 남의 댓글 더보기(Figma `5367:110378`): 「신고」/「취소」. 시트가 다 닫힌 뒤 신고 시트
  const openReportMenu = (title: string, onSelect: () => void) => {
    let chosen = false;
    openOverlay(
      (rootProps, close) => (
        <MoreMenuSheet
          {...rootProps}
          title={title}
          cancelLabel={text.cancel}
          items={[
            {
              id: 'report',
              label: text.report,
              leftIcon: <LineAlertMediumIcon aria-hidden />,
              onSelect: () => {
                chosen = true;
                close();
              },
            },
          ]}
        />
      ),
      () => {
        if (chosen) onSelect();
      },
    );
  };

  // 번들 신고: 접수되면 이전 화면(피드)으로 가서 알림(이 화면은 떠나므로 피드 위치)
  const reportBundle = () =>
    openReport(text.reportBundleTitle, () => {
      backOr(FEED_PATHS.home);
      toast(text.reported, { bottomOffset: FEED_TOAST_OFFSET });
    });

  // 번들 삭제(Figma `5367:122187`): 창이 다 닫힌 뒤 지우고 이전 화면으로 가서 알림(이 화면은 떠나므로 피드 위치)
  const openDeleteBundle = () => {
    let confirmed = false;
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={text.deleteBundleTitle}
          description={text.deleteBundleDescription}
          cancelLabel={text.cancel}
          confirmLabel={text.deleteBundleConfirm}
          onConfirm={() => {
            confirmed = true;
            close();
          }}
        />
      ),
      () => {
        if (!confirmed) return;
        bundleEdits.remove(bundle.id);
        backOr(FEED_PATHS.home);
        toast(text.bundleDeleted, { fullWidth: true, bottomOffset: FEED_TOAST_OFFSET });
      },
    );
  };

  // 메인 관리자 헤더 더보기(Figma `5367:123992`): 「수정하기」/「공개 범위 설정」/「삭제하기」/「취소」
  const openOwnerMenu = () => {
    let next: (() => void) | undefined;
    openOverlay(
      (rootProps, close) => (
        <MoreMenuSheet
          {...rootProps}
          title={text.bundleMore}
          cancelLabel={text.cancel}
          items={[
            {
              id: 'edit',
              label: text.edit,
              leftIcon: <LinePencilMediumIcon aria-hidden />,
              // ponytail: 번들 수정 화면(기능명세서 6.2.12)이 없어 시트만 닫음. 다음 이슈에서 이동 연결
              onSelect: close,
            },
            {
              id: 'visibility',
              label: text.visibilitySetting,
              leftIcon: <LineLockMediumIcon aria-hidden />,
              onSelect: () => {
                next = () => router.push(FEED_PATHS.bundleVisibility(bundle.id));
                close();
              },
            },
            {
              id: 'delete',
              label: text.deleteBundle,
              tone: 'danger',
              leftIcon: <LineTrashcanMediumIcon aria-hidden />,
              onSelect: () => {
                next = openDeleteBundle;
                close();
              },
            },
          ]}
        />
      ),
      () => next?.(),
    );
  };

  // 헤더 더보기(기능명세서 6.2.11): 다른 번치 번들, 우리 번치 번들의 메인 관리자가 아닌 역할은 「신고」, 메인 관리자는 관리 메뉴
  // 내 정보를 받기 전에는 갈래를 알 수 없어 버튼을 그리지 않음(메인 관리자에게 보였다 사라지지 않게)
  const ownBundle = viewer?.bunchId === bundle.bunch.id;
  // ponytail: 메뉴 노출과 삭제·공개 범위 변경을 화면 판단에만 기댐. API 연결 때 서버의 메인 관리자 확인으로 옮기고 실패하면 안내
  const isOwner = ownBundle && bundle.myRole === 'owner';

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
      header={header(
        viewer !== undefined ? (
          <HeaderIconButton
            label={text.bundleMore}
            onClick={isOwner ? openOwnerMenu : () => openReportMenu(text.bundleMore, reportBundle)}
          >
            <LineDotsLargeIcon />
          </HeaderIconButton>
        ) : undefined,
      )}
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
        memberOnly={memberOnlyOf(bundle.id, bundle.memberOnly)}
        className="pt-padding-p8 pb-padding-p5 px-padding-p8"
      />
      <BundlePhoto variant="detail" photos={bundle.photos} />
      <MemberComments members={bundle.memberComments} />
      <BundleEngagement
        liked={likes.isLiked(bundle)}
        likeCount={likes.likeCount(bundle)}
        onLike={() => asBunch(() => likes.toggle(bundle))}
        commentCount={bundle.commentCount + addedCount - hiddenCount}
        onComment={goToComments}
        className="pb-padding-p8 pt-6"
      />
      <div aria-hidden="true" className="bg-surface-secondary h-2" />
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <section
        ref={commentsRef}
        aria-label={text.commentsTitle}
        tabIndex={-1}
        className="focus:outline-none"
      >
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
                  moreLabel={
                    comment.mine
                      ? text.myCommentMore
                      : text.commentMore(comment.author, previewOf(comment.content))
                  }
                  // 내 댓글은 삭제, 남의 댓글은 신고. 삭제된 댓글은 메뉴 없음
                  onMore={
                    comment.deleted
                      ? undefined
                      : comment.mine
                        ? () => openCommentMenu(comment)
                        : () => openReportMenu(text.commentMenuTitle, () => reportComment(comment))
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
