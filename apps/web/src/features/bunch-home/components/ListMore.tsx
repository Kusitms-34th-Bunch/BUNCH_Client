'use client';

import type { RefObject } from 'react';
import { Button } from '@app/design-system';
import { useIntersectionObserver } from 'react-simplikit';
import type { ListMoreQuery } from '../lib/pages';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';

// 새로 붙은 항목 안에서 초점을 받을 수 있는 요소
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ListMoreProps = {
  query: ListMoreQuery;
  /** 항목(`li`)을 바로 담은 목록. 「다시 시도」 성공 뒤 초점 이동 기준이라 `tabIndex={-1}`을 둠 */
  listRef: RefObject<HTMLElement | null>;
};

/**
 * 목록 끝 이어서 불러오기(피드와 같은 방식): 끝이 보이면 다음 쪽, 실패하면 받은 목록은 두고 안내와 「다시 시도」
 * 「다시 시도」가 성공하면 새로 붙은 첫 항목(초점을 줄 수 없으면 목록)으로 초점 이동
 */
export function ListMore({ query, listRef }: ListMoreProps) {
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;
  // 감지 요소는 받을 수 있을 때만 그려, 새로 붙는 순간 이미 보이면 바로 받음(실패한 뒤에는 버튼으로만)
  const canLoad = hasNextPage && !isFetchingNextPage && !isFetchNextPageError;
  const observe = useIntersectionObserver<HTMLSpanElement>((entry) => {
    if (entry.isIntersecting) void fetchNextPage();
  }, {});
  const retry = async () => {
    if (isFetchingNextPage) return;
    const before = listRef.current?.children.length ?? 0;
    const result = await fetchNextPage();
    if (result.isFetchNextPageError) return;
    // 받은 쪽이 그려진 뒤(Query 알림도 setTimeout 0이라 그 뒤) 새 첫 항목, 없으면 목록으로
    setTimeout(() => {
      const list = listRef.current;
      const item = list?.children[before];
      (item?.querySelector<HTMLElement>(FOCUSABLE) ?? list)?.focus();
    }, 0);
  };
  const failed = isFetchNextPageError && !isFetchingNextPage;
  // 끝까지 받았으면 그리지 않음(다음 쪽이 있을 때 빈 상태 영역부터 붙어 이후 글자가 낭독됨)
  if (!hasNextPage && !isFetchNextPageError) return null;

  return (
    <div className="relative">
      {canLoad ? (
        <span ref={observe} aria-hidden="true" className="absolute top-0 size-px" />
      ) : null}
      <p role="status" className="sr-only">
        {isFetchingNextPage
          ? BUNCH_HOME_MESSAGES.moreLoading
          : failed
            ? BUNCH_HOME_MESSAGES.moreFailed
            : ''}
      </p>
      {/* 다시 받는 동안에도 버튼을 남겨 누른 초점을 지킴 */}
      {isFetchNextPageError ? (
        <div className="gap-s6 py-s8 flex flex-col items-center">
          <p
            aria-hidden="true"
            className="typography-body-3-regular text-text-tertiary text-center"
          >
            {BUNCH_HOME_MESSAGES.moreFailed}
          </p>
          <Button
            variant="tertiary"
            size="sm"
            aria-disabled={isFetchingNextPage || undefined}
            onClick={() => void retry()}
          >
            {BUNCH_HOME_MESSAGES.moreRetry}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
