'use client';

import { useSearchParams } from 'next/navigation';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { bundleHeroKey } from '@/shared/lib/navigation/heroKeys';
import { BundleDetailRoute } from './BundleDetailRoute';

const COMMENT_ID = /^[1-9]\d{0,18}$/;

/**
 * 상세 화면 틀(전환 이름·zoom 표식)과 주소 query 해석
 * query는 클라이언트에서 읽음: 서버가 읽으면 요청마다 그리는 화면이 되어 미리 받기·캐시가 안 되고 누른 뒤 서버 왕복을 기다림(#532)
 */
export function BundleDetailFrame({ bunchId, bundleId }: { bunchId: string; bundleId: string }) {
  const query = useSearchParams();
  // 같은 이름이 둘 이상이면(?focus=a&focus=b) 알 수 없는 값으로 봄
  const single = (key: string) => {
    const values = query.getAll(key);
    return values.length === 1 ? values[0] : undefined;
  };
  const fromBubble = single('focus') === 'comments';
  const showComments = single('section') === 'comments';
  const comment = single('comment');
  return (
    <div
      // 말풍선 진입은 피드 카드가 화면으로 열리는 zoom(AppTransitions), 그 밖은 같은 상세 규칙
      data-ssgoi-transition={
        fromBubble ? FEED_PATHS.transitionIds.bundleComments : FEED_PATHS.transitionIds.bundle
      }
      // zoom이 열리는 동안 덮는 피드 카드 복제본(맨 위 사진부터 보임)을 숨김: 이미 댓글 위치인 상세가 카드 자리에서 바로 펼쳐지게
      // 복제본은 계산된 스타일을 inline으로 받고 zoom 표식이 지워져서 enter 표식이 없는 형제를 important로 숨김
      className={`bg-surface-primary flex h-full min-h-0 flex-1 flex-col ${fromBubble ? '[&>:not([data-zoom-enter-key])]:invisible!' : ''}`}
    >
      {/* 알 수 없는 focus·section·comment 값은 무시. focus는 말풍선(입력란 초점), section은 댓글 알림(스크롤만), comment는 그 알림의 댓글 ID, via=push는 푸시로 열림 */}
      {/* zoom은 화면 안에서 같은 값의 enter 표식을 정확히 하나 찾음(틀 자신은 찾지 않아 안쪽에 둠, 피드 카드는 exit 표식) */}
      <div data-zoom-enter-key={bundleHeroKey(bundleId)} className="flex min-h-0 flex-1 flex-col">
        <BundleDetailRoute
          bunchId={bunchId}
          bundleId={bundleId}
          focusComments={fromBubble}
          showComments={showComments}
          targetCommentId={
            showComments && comment !== undefined && COMMENT_ID.test(comment) ? comment : undefined
          }
          instantComment={single('via') === 'push'}
        />
      </div>
    </div>
  );
}
