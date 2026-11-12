'use client';

import { useEffect, useRef } from 'react';
import type { PhotoBoxData } from '../lib/types';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';

const CELLS = [0, 1, 2];

type PhotoBoxMoreProps = {
  state: PhotoBoxData['more'];
  /** 이어 받다 실패한 쪽부터 다시 받음 */
  onRetry: () => void;
};

/**
 * 목록 맨 아래 표시(명세 3.1.3): 남은 사진을 받는 동안은 회색 자리표시 한 줄(Figma에 없는 상태라 사진 칸과 같은 회색)
 * 이어 받다 실패하면 표시를 숨기고, 사용자가 아래로 다시 스크롤할 때 재시도
 * 짧은 목록은 끝이 계속 보여 스크롤로 재시도할 수 없으므로 키보드·스크린 리더용 버튼(포커스 때만 보임)을 함께 배치
 * 안내 live region은 항상 마운트하고 문구만 바꿈(새로 마운트되는 region은 낭독되지 않는 경우가 많음)
 */
export function PhotoBoxMore({ state, onRetry }: PhotoBoxMoreProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // 호출하는 쪽이 렌더마다 새 함수를 줘도 관찰을 다시 시작하지 않도록 최신 콜백만 ref로 읽음
  const retryRef = useRef(onRetry);
  useEffect(() => {
    retryRef.current = onRetry;
  });
  const failed = state === 'error';

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!failed || !wrapper || typeof IntersectionObserver === 'undefined') return;
    // 실패한 순간 끝이 이미 보이고 있어도 바로 다시 보내지 않고, 한 번 벗어났다가 다시 보일 때만 시도
    let leftView = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) leftView = true;
        else if (leftView) {
          leftView = false;
          retryRef.current();
        }
      }
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [failed]);

  // 버튼이 사라져도(재시도가 시작되면 실패 표시가 로딩으로 바뀜) 포커스가 문서 처음으로 돌아가지 않도록 이 영역으로 옮김
  const handleRetry = () => {
    retryRef.current();
    wrapperRef.current?.focus({ preventScroll: true });
  };

  let announcement = '';
  if (state === 'loading') announcement = PHOTO_BOX_MESSAGES.loadingMore;
  else if (failed) announcement = PHOTO_BOX_MESSAGES.loadMoreFailed;

  return (
    <div ref={wrapperRef} tabIndex={-1} className="outline-none">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {state === 'loading' ? (
        <div aria-hidden="true" className="mt-px grid grid-cols-3 gap-px">
          {CELLS.map((cell) => (
            <div key={cell} className="bg-surface-tertiary aspect-square" />
          ))}
        </div>
      ) : null}
      {failed ? (
        <button
          type="button"
          onClick={handleRetry}
          className="focus-visible:p-s5 sr-only focus-visible:not-sr-only"
        >
          {PHOTO_BOX_MESSAGES.loadMore}
        </button>
      ) : null}
    </div>
  );
}
