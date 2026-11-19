'use client';

import { isApiError } from '@app/api-core';
import { toast } from '@app/design-system';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { isUnavailableTarget } from '@/shared/api/errorStatus';
import { openTabPath } from '@/shared/bridge/client';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useHoldScrollOnLeave } from '@/shared/hooks/useHoldScrollOnLeave';
import { formatElapsedTime } from '@/shared/lib/elapsedTime';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { useBundleComments } from '../../hooks/useBundleComments';
import { useBundleOwnerMenu } from '../../hooks/useBundleOwnerMenu';
import { useBundleReport } from '../../hooks/useBundleReport';
import { useBundleSheets } from '../../hooks/useBundleSheets';
import { useClientNow } from '../../hooks/useClientNow';
import { useCommentActions } from '../../hooks/useCommentActions';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { useLikeToggle } from '../../hooks/useLikeToggle';
import { getBundlePreview } from '../../lib/bundlePreview';
import { type BundleBunchSource, toFeedBundleDetail, toFeedBunch } from '../../model/bundleDetail';
import { bundleDetailQueryOptions } from '../../queries/bundleDetail';
import { BundleDetailScreen } from './BundleDetailScreen';

type BundleDetailProps = {
  bunchId: string;
  bundleId: string;
  /** 번치 이름·이미지(route가 번치 홈 응답에서 넘김). 받는 중 undefined, 받지 못하면 null */
  bunch: BundleBunchSource | null | undefined;
  /** 말풍선에서 들어옴(?focus=comments): 댓글 영역으로 스크롤하고 입력란 활성화 */
  focusComments: boolean;
  /** 댓글 알림에서 들어옴(?section=comments): 댓글 영역으로 스크롤만 함(읽으러 온 것이라 키보드를 올리지 않음) */
  showComments: boolean;
  /** 다른 기능의 화면 주소(route가 조합) */
  links: { bunchHome: string; otherBunch: (_bunchId: string) => string };
};

// 댓글 영역 진입이 화면 전환 끝을 기다리는 최대 시간(전환이 중단돼 표식이 남아도 스크롤·초점은 함)
const ENTRY_TRANSITION_WAIT_MS = 1000;
// 진입 대기 중 누르면 사용자 조작으로 보는 요소(누르면 초점·동작이 생기는 것)
const INTERACTIVE_SELECTOR =
  'a[href], button, input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])';

const codeOf = (error: unknown) => (isApiError(error) ? error.code : undefined);
// 번들을 볼 수 없게 됨(명세 014~017: 비공개 접근 불가·차단·없음·내보내짐). 가입 미완료 등 계정 오류는 빼고 코드로 가림
const isGone = (error: unknown) =>
  ['AUTH_002', 'BUNCH_009', 'RESOURCE_001', 'BUNCH_008'].includes(codeOf(error) ?? '');

/**
 * 번들 상세(기능명세서 6.2): 상세·댓글·명의를 받아 `BundleDetailScreen`에 넘기고 이동·토스트·시트·초점을 맡음
 * 내용은 발행 번들 상세(명세 084), 댓글은 명세 014~017, 신고는 018·019, 삭제는 048(공개 범위는 `BundleVisibilityScreen`). 「수정하기」는 메뉴만 있음
 */
export function BundleDetail({
  bunchId,
  bundleId,
  bunch,
  focusComments,
  showComments,
  links,
}: BundleDetailProps) {
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
  const report = useBundleReport({ bundleId, viewerName: viewer?.name ?? '', asBunch });
  const likes = useLikeToggle(viewer);
  const commentsRef = useRef<HTMLElement>(null);
  const { openPlaces, openMembers } = useBundleSheets();
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

  // 쓰는 사이 번들을 볼 수 없게 됨(지워짐·멤버 공개·차단·내보내짐): 이전 화면으로 가서 알림
  const left = useRef(false);
  const leaveGone = useCallback(() => {
    if (left.current) return;
    left.current = true;
    backOr(FEED_PATHS.home);
    toastAfterNavigation(text.bundleGone);
  }, [backOr]);

  // 댓글 등록·삭제·신고의 공통 실패: 번들을 볼 수 없게 됐으면 떠나고, 소속 번치가 사라졌으면 명의를 다시 받음
  const failAction = (error: unknown) => {
    if (isGone(error)) {
      leaveGone();
      return;
    }
    if (codeOf(error) === 'BUNCH_010') void retryViewer();
    toast(text.actionFailed);
  };

  // 입력란은 CommentComposer 안쪽이라 감싼 요소에서 찾음
  // preventScroll이면 iOS가 입력란을 키보드 위로 올리지 않아 가려지므로 막지 않음
  // 진입 초점은 전환이 끝난 뒤에 주므로(아래 effect) 바깥 틀이 가로로 밀릴 일도 없음
  const focusInput = useCallback(() => composerRef.current?.querySelector('textarea')?.focus(), []);

  const comment = useCommentActions({
    thread,
    viewer,
    viewerId,
    asBunch,
    report,
    failAction,
    focusInput,
    commentsRef,
  });

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

  // scrollIntoView는 전환 중 가로로 밀린 화면을 보이려고 바깥 틀까지 가로 스크롤하므로 세로 스크롤 main만 움직임
  const scrollToComments = useCallback(() => {
    const section = commentsRef.current;
    const main = section?.closest('main');
    if (section && main) {
      main.scrollTop += section.getBoundingClientRect().top - main.getBoundingClientRect().top;
    }
  }, []);
  const goToComments = useCallback(() => {
    scrollToComments();
    focusInput();
  }, [scrollToComments, focusInput]);

  // 댓글 영역은 본문이 그려진 뒤에 생김(번치 정보·상세를 받는 중에는 없음)
  const contentReady = bundle !== undefined;
  const commentsEntry = focusComments ? 'focus' : showComments ? 'scroll' : null;
  useEffect(() => {
    if (commentsEntry === null || !contentReady) return;
    const startedAt = performance.now();
    let frame = 0;
    // 기다리는 동안 사용자가 직접 조작하면(키, 누를 수 있는 요소를 누름) 그 초점·위치를 지키도록 예약한 스크롤·초점을 취소
    // 빈 곳 누름(말풍선을 연달아 두 번 눌러 새 화면에 떨어진 두 번째 누름 등)은 취소하지 않음
    const stopListening = () => {
      document.removeEventListener('keydown', cancel, true);
      document.removeEventListener('pointerdown', cancelOnControl, true);
    };
    function cancel() {
      cancelAnimationFrame(frame);
      stopListening();
    }
    function cancelOnControl(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) cancel();
    }
    document.addEventListener('keydown', cancel, true);
    document.addEventListener('pointerdown', cancelOnControl, true);
    const run = () => {
      // 화면 전환(나가는 화면의 data-page-leaving)이 끝난 뒤 스크롤·초점. 전환이 멈춰 표식이 남아도 잠시 뒤에는 진행
      if (
        document.querySelector('[data-page-leaving]') !== null &&
        performance.now() - startedAt < ENTRY_TRANSITION_WAIT_MS
      ) {
        frame = requestAnimationFrame(run);
        return;
      }
      stopListening();
      scrollToComments();
      if (commentsEntry === 'focus') focusInput();
    };
    // effect에서 바로 주면 RouteFocus가 이동 전에 남은 초점으로 보고 제목으로 옮기므로 다음 프레임에
    frame = requestAnimationFrame(run);
    return () => {
      cancel();
      stopListening();
    };
  }, [commentsEntry, contentReady, scrollToComments, focusInput]);

  // 목록(다음 쪽 포함)이 번들을 볼 수 없다고 하면 떠남(답글·삭제 실패 뒤 다시 받은 목록도, 답글 대상 없음과 번들 없음이 같은 404라서)
  const listGone = isGone(thread.error);
  useEffect(() => {
    if (listGone && contentReady) leaveGone();
  }, [listGone, contentReady, leaveGone]);

  const { openOwnerMenu, removing } = useBundleOwnerMenu({
    bunchId,
    bundleId,
    viewerId,
    onPermissionChanged: () => void detail.refetch(),
    onError: failAction,
  });

  const back = () => backOr(FEED_PATHS.home);

  // 지웠거나 없음·볼 수 없음(404·403)과 잘못된 주소(400)는 같은 안내, 그 밖의 실패는 다시 시도
  const unavailable = isUnavailableTarget(detail.error);
  // 이미 받은 상세가 있으면 다시 받기가 실패해도 보던 내용을 그대로 둠
  const failed =
    !unavailable && (detail.isError || (viewer === undefined && viewerFailed)) && !detail.data;
  if ((unavailable && !detail.data) || failed || !bundle) {
    const previewBundle = getBundlePreview(bunchId, bundleId);
    return (
      <BundleDetailScreen
        onBack={back}
        status={{
          kind: failed ? 'failed' : unavailable && !detail.data ? 'unavailable' : 'loading',
          preview: previewBundle && {
            bundle: previewBundle,
            time: now === null ? '' : formatElapsedTime(previewBundle.publishedAt, now),
          },
          titleRef: stateTitleRef,
          onRetry: () => {
            focusTitleAfterRetry.current = true;
            void (detail.isError ? detail.refetch() : retryViewer());
          },
        }}
      />
    );
  }

  // 번들 신고: 접수되면 이전 화면(피드)으로 가서 알림(이 화면은 떠나므로 피드 위치)
  const reportBundle = () =>
    report.openReport(
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

  // 헤더 더보기(기능명세서 6.2.11): 다른 번치 번들, 우리 번치 번들의 메인 관리자가 아닌 역할은 「신고」, 메인 관리자는 관리 메뉴
  // 메뉴 갈래는 서버 권한(수정·삭제 권한이면 관리 메뉴, 신고 권한이면 신고). 모두 없으면 버튼 없음
  const isOwner = bundle.canEdit || bundle.canDelete;
  const more = isOwner
    ? () => openOwnerMenu(bundle)
    : bundle.canReport
      ? () => report.openReportMenu(text.bundleMore, reportBundle)
      : undefined;

  return (
    <BundleDetailScreen
      onBack={back}
      bundle={bundle}
      time={now === null || !bundle.publishedAt ? '' : formatElapsedTime(bundle.publishedAt, now)}
      commentCount={(thread.totalCount ?? bundle.commentCount) - thread.hiddenCount}
      thread={{
        comments: thread.comments,
        moreRef: thread.moreRef,
        loading: thread.loading,
        failed: thread.failed,
        retry: thread.retry,
        fetchingMore: thread.fetchingMore,
        moreFailed: thread.moreFailed,
        moreFailures: thread.moreFailures,
        loadMore: thread.loadMore,
        canLoadMore: thread.canLoadMore,
      }}
      removing={removing}
      noBunch={viewer === null}
      commentsRef={commentsRef}
      composerRef={composerRef}
      composer={{
        value: comment.draft,
        onValueChange: comment.setDraft,
        onSubmit: comment.submit,
        placeholder: comment.placeholder,
        replyAuthor: comment.replyAuthor,
        onCancelReply: comment.cancelReply,
      }}
      announcement={comment.announcement}
      actions={{
        more,
        // 내 번치는 번치 탭 첫 화면이라 iOS 쉘에서는 번치 탭으로 전환(지금 탭이 번치면 그대로 이동)
        openBunch: () =>
          viewer?.bunchId === bundle.bunch.id
            ? openTabPath(links.bunchHome, (href) => router.push(href))
            : router.push(links.otherBunch(bundle.bunch.id)),
        openMembers: () => openMembers(bundle.members),
        openPlaces: () => openPlaces(bundle.id, bundle.places),
        like: () => asBunch(() => likes.toggle(bundle)),
        goToComments,
        reply: comment.startReply,
        myCommentMore: comment.openCommentMenu,
        reportMore: comment.openReportMenu,
      }}
    />
  );
}
