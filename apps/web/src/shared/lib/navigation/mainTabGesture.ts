// 하단 탭 막대의 제스처를 그 탭 화면에 알림(탭 막대와 탭 화면이 서로 다른 feature라 shared가 이어 줌)
export type MainTabGesture = { tab: string; kind: 'doublePress' | 'longPress' };

const channel = new EventTarget();

/** 받아 처리한 화면이 있으면 true(화면이 받는 중·오류라 없으면 탭 막대가 평소 동작을 이어 감) */
export const emitMainTabGesture = (gesture: MainTabGesture) =>
  !channel.dispatchEvent(
    new CustomEvent<MainTabGesture>('gesture', { detail: gesture, cancelable: true }),
  );

/** listener가 true를 돌려주면 처리한 것. 구독을 끊는 함수를 돌려줌 */
export const onMainTabGesture = (listener: (_gesture: MainTabGesture) => boolean) => {
  const handle = (event: Event) => {
    if (listener((event as CustomEvent<MainTabGesture>).detail)) event.preventDefault();
  };
  channel.addEventListener('gesture', handle);
  return () => channel.removeEventListener('gesture', handle);
};
