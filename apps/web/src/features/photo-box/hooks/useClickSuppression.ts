import { type MouseEvent, useEffect, useRef } from 'react';

// 포인터가 이미 처리한 탭·쓸기 뒤에 따라오는 클릭을 이 시간 동안 막음
const CLICK_SUPPRESS_MS = 400;

/** 포인터가 이미 처리한 동작 뒤에 따라오는 클릭을 잠시 막는 상태와 capture handler */
export function useClickSuppression() {
  // 쓸기가 끝난 직후 따라오는 클릭이 사진을 다시 토글하지 않게 한 번 막음
  const suppressClickRef = useRef(false);
  // 포인터가 이미 처리한 동작 뒤에 따라오는 클릭을 막는 시간(터치는 손가락을 뗀 뒤 클릭이 별도 작업으로 오므로 0ms로는 부족함)
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(suppressTimerRef.current), []);

  const suppressNextClick = () => {
    clearTimeout(suppressTimerRef.current);
    suppressClickRef.current = true;
    suppressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = false;
    }, CLICK_SUPPRESS_MS);
  };

  // 새로 누르면 이전 동작의 클릭 억제는 끝냄
  const clearSuppression = () => {
    clearTimeout(suppressTimerRef.current);
    suppressClickRef.current = false;
  };

  // 쓸기 직후 이어지는 클릭(같은 사진 위에서 뗐을 때)이 방금 처리한 사진을 되돌리지 않게 막음
  const handleClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return { suppressNextClick, clearSuppression, handleClickCapture };
}
