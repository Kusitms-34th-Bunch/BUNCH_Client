'use client';

import { isApiError } from '@app/api-core';
import {
  Button,
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
import { useQuery } from '@tanstack/react-query';
import Image, { type StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { isUnavailableTarget } from '@/shared/api/errorStatus';
import { toWireId } from '@/shared/api/ids';
import commentEmpty from '@/shared/assets/images/empty/comment-empty.svg';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { LoadingRipple } from '@/shared/components/loading/LoadingRipple';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useHoldScrollOnLeave } from '@/shared/hooks/useHoldScrollOnLeave';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { formatElapsedTime } from '@/shared/lib/elapsedTime';
import { REPORT_OTHER, REPORT_REASONS } from '@/shared/lib/reportReasons';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import type { FeedComment } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { bundleHeroKey, FEED_PATHS } from '../../constants/paths';
import { useBundleComments } from '../../hooks/useBundleComments';
import { useBundleSheets } from '../../hooks/useBundleSheets';
import { useClientNow } from '../../hooks/useClientNow';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import { DELETED_USER_IMAGE, hideLeftMemberImages } from '../../lib/deletedUserImage';
import { withRo } from '../../lib/josa';
import { type BundleBunchSource, toFeedBundleDetail, toFeedBunch } from '../../model/bundleDetail';
import { bundleDetailQueryOptions } from '../../queries/bundleDetail';
import { useDeletePublishedBundleMutation, useForgetBundle } from '../../queries/manageBundle';
import { useReportMutation } from '../../queries/report';
import { MemberComments } from './MemberComments';

type BundleDetailScreenProps = {
  bunchId: string;
  bundleId: string;
  /** 번치 이름·이미지(route가 번치 홈 응답에서 넘김). 받는 중 undefined, 받지 못하면 null */
  bunch: BundleBunchSource | null | undefined;
  /** 말풍선에서 들어옴(?focus=comments): 댓글 영역으로 스크롤하고 입력란 활성화 */
  focusComments: boolean;
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { bunchHome: string; otherBunch: (_bunchId: string) => string };
};

const COMMENT_MAX_LENGTH = 200;
const ANNOUNCE_CLEAR_MS = 5000;
const codeOf = (error: unknown) => (isApiError(error) ? error.code : undefined);
// 번들을 볼 수 없게 됨(명세 014~017: 비공개 접근 불가·차단·없음·내보내짐). 가입 미완료 등 계정 오류는 빼고 코드로 가림
const isGone = (error: unknown) =>
  ['AUTH_002', 'BUNCH_009', 'RESOURCE_001', 'BUNCH_008'].includes(codeOf(error) ?? '');
// 버튼 이름에 붙일 댓글 앞부분: 줄바꿈을 공백으로, 이모지가 반으로 잘리지 않게 글자 단위로 20자
const previewOf = (content = '') =>
  Array.from(content.replace(/\s+/g, ' ').trim()).slice(0, 20).join('');

/**
 * 번들 상세(기능명세서 6.2, Figma `5367:103510`·`5367:103541`): 번치 정보 → 제목·위치·날짜 → 사진 → 멤버별 코멘트 → 좋아요·댓글 수 → 댓글 목록, 아래 고정 입력란
 * 내용은 발행 번들 상세(명세 084), 댓글은 명세 014~017, 신고는 018·019, 삭제는 048(공개 범위는 `BundleVisibilityScreen`). 「수정하기」는 메뉴만 있음
 */
export function BundleDetailScreen({
  bunchId,
  bundleId,
  bunch,
  focusComments,
  links,
}: BundleDetailScreenProps) {
  const router = useRouter();
  const backOr = useBackOr();
  const now = useClientNow();
  const composerRef = useRef<HTMLDivElement>(null);
  const { viewer, viewerFailed, viewerFetching, retryViewer, asBunch } = useFeedViewer();
  const viewerId = viewer === undefined ? undefined : (viewer?.bunchId ?? null);
  const detail = useQuery(bundleDetailQueryOptions(bunchId, bundleId, viewerId));
  // 댓글 커서를 이어 쓸 수 없으면(다른 기기에서 번치 전환 등) 명의도 다시 받음
  const refreshViewer = usePreservedCallback(() => void retryViewer());
  const thread = useBundleComments(bundleId, viewerId, refreshViewer);
  const report = useReportMutation();
  const { comments, moreRef } = thread;
  const likes = useLikeToggle(viewer);
  const keyboardOpen = useKeyboardOpen();
  const commentsRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; author: string } | null>(null);
  const { openPlaces, openMembers } = useBundleSheets();
  const openOverlay = useScreenOverlay();
  const removeBundle = useDeletePublishedBundleMutation();
  // 지운 번들의 캐시는 이 화면이 떠날 때 비움(떠 있는 동안 비우면 빈 상세를 다시 받아 안내가 깜빡임)
  const forgetBundle = useForgetBundle(bundleId);
  const deleted = useRef(false);
  useEffect(
    () => () => {
      if (deleted.current) forgetBundle();
    },
    [forgetBundle],
  );
  const bundle =
    !detail.data || bunch === undefined
      ? undefined
      : toFeedBundleDetail(
          detail.data,
          // 번치 정보를 받지 못해도 내용은 보임(기본 이미지와 「번치」, 버튼 이름이 비지 않게)
          bunch ? toFeedBunch(bunch) : { id: bunchId, name: text.unknownBunch },
        );
  // 「다시 시도」가 성공해 버튼이 사라지면 번들 제목으로 초점
  const focusTitleAfterRetry = useRef(false);
  const [announcement, setAnnouncement] = useState('');
  // 같은 문구를 이어서 알려도 다시 읽히도록 끝에 보이지 않는 공백을 번갈아 붙임
  // 몇 초 뒤 비워, 뒤이은 받는 중 안내가 읽히고 끝난 뒤 지난 안내로 돌아가지 않게 함
  const announceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(announceTimer.current), []);
  const announce = (message: string) => {
    setAnnouncement((current) => (current === message ? `${message}\u00a0` : message));
    clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(''), ANNOUNCE_CLEAR_MS);
  };
  // 등록·삭제가 반영된 뒤 초점을 옮길 댓글
  const focusCommentId = useRef<string | null>(null);
  // 지운 결과(답글 상태 해제로 입력란 높이도 바뀜)가 그려진 뒤 띄울 토스트
  const pendingToast = useRef<string | null>(null);

  // 받는 중 화면에서 시작하면 댓글 영역이 그려진 뒤 붙잡기 등록
  useHoldScrollOnLeave(commentsRef, bundle !== undefined);

  // 다시 시도(상세나 내 정보)를 받는 중
  const retrying = detail.isFetching || viewerFetching;
  // 볼 수 없음·실패 안내의 제목(다시 시도 결과가 「볼 수 없음」이면 초점을 받는 곳)
  const stateTitleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // 본문이나 안내 제목이 그려질 때까지 기다림(상세가 먼저 와도 번치 정보를 받는 동안은 덮개)
    if (!focusTitleAfterRetry.current || retrying || (!bundle && !stateTitleRef.current)) return;
    focusTitleAfterRetry.current = false;
    // 다시 실패해 버튼이 남았으면 초점도 그대로
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.isConnected) return;
    const title =
      stateTitleRef.current ?? commentsRef.current?.closest('main')?.querySelector('h1');
    if (!title) return;
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  });

  // 입력란은 CommentComposer 안쪽이라 감싼 요소에서 찾음
  const focusInput = useCallback(
    () => composerRef.current?.querySelector('textarea')?.focus({ preventScroll: true }),
    [],
  );

  // scrollIntoView는 전환 중 가로로 밀린 화면을 보이려고 바깥 틀까지 가로 스크롤하므로 세로 스크롤 main만 움직임
  const goToComments = useCallback(() => {
    const section = commentsRef.current;
    const main = section?.closest('main');
    if (section && main) {
      main.scrollTop += section.getBoundingClientRect().top - main.getBoundingClientRect().top;
    }
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
    toast(message);
  }, [comments]);

  // 댓글 영역은 본문이 그려진 뒤에 생김(번치 정보·상세를 받는 중에는 없음)
  const contentReady = bundle !== undefined;
  useEffect(() => {
    if (!focusComments || !contentReady) return;
    // effect에서 바로 주면 RouteFocus가 이동 전에 남은 초점으로 보고 제목으로 옮기므로 다음 프레임에
    const frame = requestAnimationFrame(goToComments);
    return () => cancelAnimationFrame(frame);
  }, [focusComments, contentReady, goToComments]);

  // 쓰는 사이 번들을 볼 수 없게 됨(지워짐·멤버 공개·차단·내보내짐): 이전 화면으로 가서 알림
  const left = useRef(false);
  const leaveGone = useCallback(() => {
    if (left.current) return;
    left.current = true;
    backOr(FEED_PATHS.home);
    toastAfterNavigation(text.bundleGone);
  }, [backOr]);
  // 목록(다음 쪽 포함)이 번들을 볼 수 없다고 하면 떠남(답글·삭제 실패 뒤 다시 받은 목록도, 답글 대상 없음과 번들 없음이 같은 404라서)
  const listGone = isGone(thread.error);
  useEffect(() => {
    if (listGone && contentReady) leaveGone();
  }, [listGone, contentReady, leaveGone]);

  // 응답을 기다리는 사이 명의(지금 번치)가 바뀌었는지(늦게 온 결과를 새 명의의 목록에 적용하지 않게)
  const isViewer = usePreservedCallback((id: string | null | undefined) => id === viewerId);

  // 남의 댓글 신고: 접수되면 그 댓글(원댓글이면 답글까지)을 바로 숨기고 그 자리 다음 댓글로 초점
  // 시트가 닫힌 시점의 최신 목록으로 계산
  const hideReported = usePreservedCallback((comment: FeedComment) => {
    const index = comments.findIndex(({ id }) => id === comment.id);
    // 숨길 범위(원댓글이면 그 답글까지) 다음의 첫 댓글, 없으면 앞 댓글
    const gone = (item: FeedComment) => item.id === comment.id || item.parentId === comment.id;
    const nextItem = comments.slice(index).find((item) => !gone(item)) ?? comments[index - 1];
    focusCommentId.current = nextItem?.id ?? 'none';
    pendingToast.current = text.reported;
    thread.hide(comment.id);
    setReplyTarget((target) => (target?.id === comment.id ? null : target));
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

  // 지웠거나 없음·볼 수 없음(404·403)과 잘못된 주소(400)는 같은 안내, 그 밖의 실패는 다시 시도
  const unavailable = isUnavailableTarget(detail.error);
  // 이미 받은 상세가 있으면 다시 받기가 실패해도 보던 내용을 그대로 둠
  const failed =
    !unavailable && (detail.isError || (viewer === undefined && viewerFailed)) && !detail.data;
  if ((unavailable && !detail.data) || failed) {
    return (
      <PageShell header={header()}>
        <div className="gap-s8 flex h-full flex-col items-center justify-center">
          {/* 알림은 감싼 요소에 두어 h1의 제목 의미를 지킴 */}
          <div role={failed ? 'alert' : undefined}>
            <h1
              ref={stateTitleRef}
              className="typography-body-2-regular text-text-quinary text-center"
            >
              {failed ? text.actionFailed : text.bundleUnavailable}
            </h1>
          </div>
          {failed ? (
            <Button
              variant="tertiary"
              size="md"
              // 누르면 받는 중 화면(덮개)으로 바뀜. 데이터 없이 실패한 query는 다시 받으면 pending
              onClick={() => {
                focusTitleAfterRetry.current = true;
                void (detail.isError ? detail.refetch() : retryViewer());
              }}
            >
              {text.retry}
            </Button>
          ) : null}
        </div>
      </PageShell>
    );
  }
  // 덮개(`PageLoading`)가 헤더까지 덮고 초점을 가져감(앱 공통). 상태 문구는 덮개와 함께 붙음
  if (!bundle) {
    return (
      <PageShell header={header()}>
        <p role="status" className="sr-only">
          {text.bundleLoading}
        </p>
        <PageLoading />
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
      // 보내는 동안은 다시 보내지 않음(연타해도 한 번만 등록, hook이 막음)
      if (!viewer || !content) return;
      const parentId = replyTarget?.id ?? null;
      thread.create(content, parentId, {
        // 기다리는 사이 고친 입력·바꾼 답글 대상은 지우지 않음
        onSuccess: (saved) => {
          setDraft((current) => (current.trim() === content ? '' : current));
          setReplyTarget((current) => ((current?.id ?? null) === parentId ? null : current));
          announce(parentId ? text.replyAdded : text.commentAdded);
          focusCommentId.current = String(saved.id);
        },
        // 실패하면 쓴 내용은 그대로 둠
        onError: (error) => {
          // 답글 대상이 그사이 지워졌거나 숨겨짐: 답글 상태를 풀고 목록을 맞춤(번들이 사라졌으면 다시 받은 목록이 알려 떠남)
          if (codeOf(error) === 'BUNDLE_002' || (parentId && codeOf(error) === 'RESOURCE_001')) {
            setReplyTarget(null);
            thread.restart();
            toast(text.replyTargetDeleted);
            return;
          }
          failAction(error);
        },
      });
    });

  // 댓글 등록·삭제·신고의 공통 실패: 번들을 볼 수 없게 됐으면 떠나고, 소속 번치가 사라졌으면 명의를 다시 받음
  const failAction = (error: unknown) => {
    if (isGone(error)) {
      leaveGone();
      return;
    }
    if (codeOf(error) === 'BUNCH_010') void retryViewer();
    toast(text.actionFailed);
  };

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
        thread.remove(comment, {
          onSuccess: () => {
            // 삭제된 댓글에는 답글을 달 수 없으므로 그 댓글에 쓰던 답글 상태를 풂
            setReplyTarget((target) => (target?.id === comment.id ? null : target));
            focusCommentId.current = comment.id;
            pendingToast.current = text.commentDeleted;
          },
          onError: (error) => {
            // 이미 지워졌거나 없는 댓글이면 바뀐 상태로 맞추고 따로 알리지 않음(번들이 사라졌으면 다시 받은 목록이 알려 떠남)
            if (codeOf(error) === 'RESOURCE_001') {
              thread.restart();
              return;
            }
            failAction(error);
          },
        });
      },
    );
  };

  // 신고 사유 시트(Figma `5367:121909`·`5367:122444`, 번치 신고와 같은 구성). 누르면 닫고 보냄
  // 결과 처리는 시트가 다 닫히고 접수가 끝난 뒤(열린 시트 뒤에서 낭독이 묻히지 않게, ADR 014)
  const openReport = (
    title: string,
    target: { commentId?: number },
    callbacks: { onSuccess: () => void; onError: (_error: unknown) => void },
  ) =>
    asBunch(() => {
      const bundleWireId = toWireId(bundleId);
      // 앞 신고를 접수하는 중에는 새로 열지 않음(닫힌 시트 뒤에서 같은 대상을 두 번 보내지 않게)
      if (bundleWireId === undefined || report.isPending) return;
      let result: Promise<{ ok: true } | { ok: false; error: unknown }> | undefined;
      openOverlay(
        (rootProps, close) => (
          <ReportSheet
            {...rootProps}
            title={title}
            description={text.reportAs(viewer?.name ?? '')}
            reasons={REPORT_REASONS}
            detailReasonValue={REPORT_OTHER}
            onSubmit={(value) => {
              // 닫히는 동안 다시 눌러도 한 번만
              if (result) return;
              close();
              // mutate 단위 콜백이라 응답 전에 화면을 떠나면 불리지 않음(떠난 뒤 한 번 더 이동하지 않게)
              result = new Promise((resolve) =>
                report.mutate(
                  { bundleId: bundleWireId, ...target, ...value },
                  {
                    onSuccess: () => resolve({ ok: true }),
                    onError: (error) => resolve({ ok: false, error }),
                  },
                ),
              );
            }}
          />
        ),
        () => {
          void result?.then((outcome) =>
            outcome.ok ? callbacks.onSuccess() : callbacks.onError(outcome.error),
          );
        },
      );
    });

  const reportComment = (comment: FeedComment) => {
    const commentId = toWireId(comment.id);
    if (commentId === undefined) return;
    const reportedAs = viewerId;
    openReport(
      text.reportCommentTitle,
      { commentId },
      {
        // 그사이 명의가 바뀌었으면 새 명의의 목록은 그대로 두고 접수만 알림
        onSuccess: () => (isViewer(reportedAs) ? hideReported(comment) : toast(text.reported)),
        onError: (error) => {
          // 그사이 지워진 댓글이면 목록을 맞춤(번들이 사라졌으면 다시 받은 목록이 알려 떠남)
          if (codeOf(error) === 'RESOURCE_001') {
            thread.restart();
            return;
          }
          failAction(error);
        },
      },
    );
  };

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
    openReport(
      text.reportBundleTitle,
      {},
      {
        onSuccess: () => {
          backOr(FEED_PATHS.home);
          toastAfterNavigation(text.reported);
        },
        onError: failAction,
      },
    );

  // 번들 삭제(Figma `5367:122187`, 명세 048): 창이 다 닫힌 뒤 서버에서 지우고 이전 화면으로 가서 알림(이 화면은 떠나므로 피드 위치)
  // 권한을 잃었으면 알리고 상세를 다시 받아 메뉴를 맞춤, 그사이 지워졌거나 볼 수 없게 됐으면 떠남
  const openDeleteBundle = () => {
    if (removeBundle.isPending) return;
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
        removeBundle.mutate(
          { bunchId, bundleId, viewerId: viewerId ?? null },
          {
            onSuccess: () => {
              deleted.current = true;
              backOr(FEED_PATHS.home);
              toastAfterNavigation(text.bundleDeleted);
            },
            onError: (error) => {
              if (codeOf(error) === 'AUTH_002') {
                toast(text.permissionChanged);
                void detail.refetch();
                return;
              }
              failAction(error);
            },
          },
        );
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
          // 항목마다 그 권한이 있을 때만(수정·공개 범위는 수정 권한, 삭제는 삭제 권한)
          items={[
            ...(bundle.canEdit
              ? [
                  {
                    id: 'edit',
                    label: text.edit,
                    leftIcon: <LinePencilMediumIcon aria-hidden />,
                    // ponytail: 번들 수정 화면(기능명세서 6.2.12)이 없어 시트만 닫음. API 연동 7번에서 이동 연결
                    onSelect: close,
                  },
                  {
                    id: 'visibility',
                    label: text.visibilitySetting,
                    leftIcon: <LineLockMediumIcon aria-hidden />,
                    onSelect: () => {
                      next = () => router.push(FEED_PATHS.bundleVisibility(bunchId, bundle.id));
                      close();
                    },
                  },
                ]
              : []),
            ...(bundle.canDelete
              ? [
                  {
                    id: 'delete',
                    label: text.deleteBundle,
                    tone: 'danger' as const,
                    leftIcon: <LineTrashcanMediumIcon aria-hidden />,
                    onSelect: () => {
                      next = openDeleteBundle;
                      close();
                    },
                  },
                ]
              : []),
          ]}
        />
      ),
      () => next?.(),
    );
  };

  // 헤더 더보기(기능명세서 6.2.11): 다른 번치 번들, 우리 번치 번들의 메인 관리자가 아닌 역할은 「신고」, 메인 관리자는 관리 메뉴
  // 메뉴 갈래는 서버 권한(수정·삭제 권한이면 관리 메뉴, 신고 권한이면 신고). 모두 없으면 버튼 없음
  const isOwner = bundle.canEdit || bundle.canDelete;

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
        isOwner || bundle.canReport ? (
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
      {/* 지우는 동안과 지운 뒤 떠날 때까지 덮개(받는 중과 같은 모양)와 안내. 실패하면 걷히고 보던 화면 그대로 */}
      {removeBundle.isPending || removeBundle.isSuccess ? (
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
        time={now === null || !bundle.publishedAt ? '' : formatElapsedTime(bundle.publishedAt, now)}
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
        onLocationClick={() => openPlaces(bundle.id, bundle.places)}
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
        onLike={() => asBunch(() => likes.toggle(bundle))}
        commentCount={(thread.totalCount ?? bundle.commentCount) - thread.hiddenCount}
        onComment={goToComments}
        className="pb-padding-p8 pt-6"
      />
      <div aria-hidden="true" className="bg-surface-secondary h-2" />
      {/* 늘 있는 상태 영역에서 글자만 바꿔 읽어 줌(등록 결과, 댓글을 받는 중) */}
      <p role="status" className="sr-only">
        {thread.loading
          ? text.commentsLoading
          : thread.fetchingMore
            ? text.moreCommentsLoading
            : announcement}
      </p>
      <section
        ref={commentsRef}
        aria-label={text.commentsTitle}
        tabIndex={-1}
        className="relative focus:outline-none"
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
                  comment.deleted
                    ? text.deletedCommentLabel
                    : comment.reply
                      ? text.replyLabel(comment.author)
                      : text.commentLabel(comment.author)
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
                  // 답글은 서버 권한(삭제되지 않은 원댓글). 소속 번치가 없으면 눌렀을 때 안내
                  onReply={
                    comment.deleted || !(comment.canReply || viewer === null)
                      ? undefined
                      : () =>
                          asBunch(() => {
                            setReplyTarget({ id: comment.id, author: comment.author });
                            focusInput();
                          })
                  }
                  moreLabel={
                    comment.canDelete
                      ? text.myCommentMore(previewOf(comment.content))
                      : text.commentMore(comment.author, previewOf(comment.content))
                  }
                  // 서버 권한대로 내 댓글은 삭제, 남의 댓글은 신고. 소속 번치가 없으면 신고를 눌렀을 때 안내
                  onMore={
                    comment.deleted
                      ? undefined
                      : comment.canDelete
                        ? () => openCommentMenu(comment)
                        : comment.canReport || viewer === null
                          ? () =>
                              openReportMenu(text.commentMenuTitle, () => reportComment(comment))
                          : undefined
                  }
                />
              </li>
            ))}
          </ul>
        ) : thread.loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingRipple />
          </div>
        ) : thread.failed ? (
          // 기능명세서는 토스트지만 다시 받을 길이 없어 그 자리에 안내와 다시 시도를 둠
          <div className="gap-s8 flex h-64 flex-col items-center justify-center">
            <p role="alert" className="typography-body-4-regular text-text-quinary">
              {text.actionFailed}
            </p>
            <Button
              variant="tertiary"
              size="md"
              // 누르면 받는 중으로 바뀌어 버튼이 사라지므로 초점을 댓글 영역에 둠
              onClick={() => {
                commentsRef.current?.focus({ preventScroll: true });
                thread.retry();
              }}
            >
              {text.retry}
            </Button>
          </div>
        ) : (
          // Figma 5367:103541: 일러스트 72×72와 문구(13/18) 사이 12, 영역 256 안에서 가운데
          <div className="gap-s6 flex h-64 flex-col items-center justify-center">
            {/* SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김 */}
            <Image src={commentEmpty as StaticImageData} alt="" width={72} height={72} />
            <p className="typography-body-4-regular text-text-quinary">{text.noComments}</p>
          </div>
        )}
        {/* 보이면 다음 쪽(실패하면 다시 내려올 때 다시 시도). 받을 수 있을 때만 그려 새로 붙는 순간 확인 */}
        {thread.canLoadMore ? (
          <div ref={moreRef} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px" />
        ) : null}
        {thread.fetchingMore && !thread.moreFailed ? (
          <div className="flex justify-center pb-6">
            <LoadingRipple />
          </div>
        ) : null}
        {thread.moreFailed ? (
          // 목록 끝이 다시 보일 때도 다시 받지만, 스크롤 없이 다시 받을 수 있게 버튼을 둠
          <div className="gap-s4 flex flex-col items-center pb-6">
            <p
              // 다시 실패하면 새로 그려 같은 안내도 다시 읽힘
              key={thread.moreFailures}
              role="alert"
              className="typography-body-4-regular text-text-quinary"
            >
              {text.moreCommentsFailed}
            </p>
            {/* 받고 나면 버튼이 사라지므로 누를 때 초점을 댓글 영역에 둠. 받는 동안은 버튼을 남기고 막음 */}
            <Button
              variant="tertiary"
              size="md"
              aria-disabled={thread.fetchingMore}
              onClick={() => {
                if (thread.fetchingMore) return;
                commentsRef.current?.focus({ preventScroll: true });
                thread.loadMore();
              }}
            >
              {text.retry}
            </Button>
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}
