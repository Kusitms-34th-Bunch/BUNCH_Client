import { useEffect, useState } from 'react';

// 전환이 끝나지 않아도 이만큼 지나면 그림(전환 450~550ms + 시작 대기)
const MAX_WAIT_MS = 1200;

/**
 * 들어오는 화면 전환이 끝났는지(나가는 화면 표식 `data-page-leaving`이 사라짐). `wait`가 false면 바로 true
 * 첫 화면 밖 내용을 전환 뒤에 그려 전환 시작 프레임을 가볍게(#573)
 */
export function useAfterEnterTransition(wait: boolean) {
  const [done, setDone] = useState(!wait);
  useEffect(() => {
    if (done) return;
    const startedAt = performance.now();
    let frame = 0;
    // 전환 표식은 마운트 뒤에 붙으므로 두 프레임은 기다린 뒤부터 확인
    let skip = 2;
    const check = () => {
      const leaving = document.querySelector('[data-page-leaving]') !== null;
      if (skip > 0 || (leaving && performance.now() - startedAt < MAX_WAIT_MS)) {
        skip -= 1;
        frame = requestAnimationFrame(check);
        return;
      }
      setDone(true);
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [done]);
  return done;
}
