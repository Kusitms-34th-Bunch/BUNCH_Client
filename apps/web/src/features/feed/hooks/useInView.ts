import { useEffect, useState } from 'react';
import { useIntersectionObserver } from 'react-simplikit';

/** 요소가 처음 화면에 보였는지(한 번 보이면 true로 남고 관찰을 멈춤). 관찰할 수 없는 환경이면 바로 true */
export function useInView<T extends HTMLElement>() {
  const [inView, setInView] = useState(false);
  const observe = useIntersectionObserver<T>((entry) => {
    if (entry.isIntersecting) setInView(true);
  }, {});
  // 관찰하지 못하면 보이는 쪽으로 둠(서버 렌더와 첫 화면은 false로 같게, 마운트 뒤에)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') queueMicrotask(() => setInView(true));
  }, []);
  // 보인 뒤에는 ref를 떼어 관찰을 멈춤
  return [inView ? undefined : observe, inView] as const;
}
