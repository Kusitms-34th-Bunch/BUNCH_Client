'use client';

import type { RefObject } from 'react';
import { Button } from '@app/design-system';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { FEED_MESSAGES as text } from '../../constants/messages';

export type BundleDetailStatusProps = {
  kind: 'loading' | 'unavailable' | 'failed';
  /** 볼 수 없음·실패 안내의 제목(다시 시도 뒤 초점을 받는 곳) */
  titleRef: RefObject<HTMLHeadingElement | null>;
  onRetry: () => void;
};

/** 번들 상세 본문을 그릴 수 없을 때: 받는 중 덮개, 볼 수 없음 안내, 실패와 다시 시도 */
export function BundleDetailStatus({ kind, titleRef, onRetry }: BundleDetailStatusProps) {
  // 덮개(`PageLoading`)가 헤더까지 덮고 초점을 가져감(앱 공통). 상태 문구는 덮개와 함께 붙음
  if (kind === 'loading') {
    return (
      <>
        <p role="status" className="sr-only">
          {text.bundleLoading}
        </p>
        <PageLoading />
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
        // 누르면 받는 중 화면(덮개)으로 바뀜. 데이터 없이 실패한 query는 다시 받으면 pending
        <Button variant="tertiary" size="md" onClick={onRetry}>
          {text.retry}
        </Button>
      ) : null}
    </div>
  );
}
