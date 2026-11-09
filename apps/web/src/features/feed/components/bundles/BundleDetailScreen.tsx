'use client';

import { Header, LineChevronLeftLargeIcon } from '@app/design-system';
import {
  BundleAuthorInfo,
  BundleEngagement,
  BundleInfo,
  BundlePhoto,
  CommentComposer,
  CommentItem,
} from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import commentEmpty from '@/shared/assets/images/empty/comment-empty.svg';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { FEED_PATHS } from '../../constants/paths';
import { getBundleDetailFixture } from '../../fixtures/bundleDetail.fixture';
import { useBundleSheets } from '../../hooks/useBundleSheets';
import { useClientNow } from '../../hooks/useClientNow';
import { useFeedViewer } from '../../hooks/useFeedViewer';
import { useHoldScrollOnLeave } from '../../hooks/useHoldScrollOnLeave';
import { useKeyboardOpen } from '../../hooks/useKeyboardOpen';
import { useLikeToggle } from '../../hooks/useLikeToggle';
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

/**
 * 번들 상세(기능명세서 6.2, Figma `5367:103510`·`5367:103541`): 번치 정보 → 제목·위치·날짜 → 사진 → 멤버별 코멘트 → 좋아요·댓글 수 → 댓글 목록, 아래 고정 입력란
 * API 연결 전 fixture. 댓글 등록·답글 등록·삭제(구현 단위 4), 더보기(5·6)는 각 단위에서 추가
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
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const { openPlaces, openMembers } = useBundleSheets();
  const bundle = getBundleDetailFixture(bundleId);

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
  const composerProps = {
    value: draft,
    onValueChange: setDraft,
    // 등록은 구현 단위 4. 지금은 번치 확인만
    onSubmit: () => asBunch(() => undefined),
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
              replyTarget={replyTarget}
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
        commentCount={bundle.commentCount}
        onComment={goToComments}
        className="pb-padding-p8 pt-6"
      />
      <div aria-hidden="true" className="bg-surface-secondary h-2" />
      <section ref={commentsRef} aria-label={text.commentsTitle}>
        {bundle.comments.length > 0 ? (
          <ul className="px-padding-p8 pt-padding-p8">
            {bundle.comments.map((comment) => (
              <li key={comment.id}>
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
                  onReply={() =>
                    asBunch(() => {
                      setReplyTarget(comment.author);
                      focusInput();
                    })
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          // Figma 5367:103541: 일러스트 72×72와 문구(13/18) 사이 12, 영역 256 안에서 가운데
          <div className="gap-s6 flex h-64 flex-col items-center justify-center">
            {/* SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김 */}
            <Image src={commentEmpty as StaticImageData} alt="" width={72} height={72} />
            <p className="typography-body-4-regular text-text-quinary">{text.noComments}</p>
          </div>
        )}
      </section>
    </PageShell>
  );
}
