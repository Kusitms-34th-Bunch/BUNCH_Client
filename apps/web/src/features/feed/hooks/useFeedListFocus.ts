import { useCallback, useLayoutEffect, useRef } from 'react';

/** 목록의 index번째 카드 첫 버튼으로 초점(없으면 이어 받기 자리나 끝 안내) */
const focusListItem = (
  container: HTMLElement | null,
  index: number,
  fallbacks: readonly (HTMLElement | null)[],
) => {
  const items = container?.querySelectorAll(':scope > ul > li');
  const target =
    items?.[index]?.querySelector<HTMLElement>('button, a[href]') ??
    fallbacks.find((element) => element !== null);
  target?.focus({ preventScroll: true });
};

type FeedListFocusOptions = {
  retrying: boolean;
  fetching: boolean;
  onRetry: (_run: () => Promise<unknown>) => void;
};

/**
 * 피드 목록의 초점: 다시 시도가 끝나면 새로 받은 카드로, 사라진 카드에 있던 초점은 다음 카드로
 * 돌려주는 ref를 목록·이어 받기 자리·끝 안내·제목·「다시 시도」에 붙임
 */
export function useFeedListFocus({ retrying, fetching, onRetry }: FeedListFocusOptions) {
  const topRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  // 끝난 뒤 초점을 옮길 카드 순번(이어 받기는 누르기 전 카드 수, 처음부터 다시 받기는 0)
  const focusAfterRetry = useRef<number | null>(null);
  const retry = (run: () => Promise<unknown>, fromStart = false) => {
    if (retrying) return;
    focusAfterRetry.current = fromStart
      ? 0
      : (topRef.current?.querySelectorAll(':scope > ul > li').length ?? 0);
    onRetry(run);
  };
  // 성공해 버튼이 사라진 렌더 뒤에 초점을 새로 받은 첫 카드로(실패면 버튼에 남아 그대로)
  // 내 정보 뒤 이어지는 피드 요청은 그 렌더에서 이미 받는 중(isFetching)으로 잡혀 끝날 때까지 기다림
  useLayoutEffect(() => {
    const index = focusAfterRetry.current;
    if (index === null || retrying || fetching) return;
    focusAfterRetry.current = null;
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.isConnected) return;
    // 카드가 없으면 다시 나타난 「다시 시도」, 이어 받기 자리, 끝 안내, 화면 제목 순
    focusListItem(topRef.current, index, [
      retryButtonRef.current,
      moreRef.current,
      endRef.current,
      titleRef.current,
    ]);
  });
  // 초점이 있던 카드가 없어지면 다음 카드로 옮김(없으면 이어 받기 자리나 끝 안내)
  const focusNextOfFocused = useCallback(() => {
    const items = [...(topRef.current?.querySelectorAll(':scope > ul > li') ?? [])];
    const at = items.findIndex((item) => item.contains(document.activeElement));
    focusListItem(topRef.current, at < 0 ? items.length : at + 1, [
      moreRef.current,
      endRef.current,
    ]);
  }, []);

  return { topRef, endRef, moreRef, titleRef, retryButtonRef, retry, focusNextOfFocused };
}
