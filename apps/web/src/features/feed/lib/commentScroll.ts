// 전환이 화면을 scale로 키우는 중이면 화면 좌표가 배율만큼 줄어 scrollTop 단위로 되돌림
export const viewScale = (main: HTMLElement) =>
  main.offsetHeight > 0 ? main.getBoundingClientRect().height / main.offsetHeight || 1 : 1;

// 대상을 맞출 자리까지 남은 세로 거리(scrollTop 단위). centered면 맨 위 대신 가운데, 화면보다 긴 대상은 윗부분
export const alignDistance = (main: HTMLElement, target: HTMLElement, centered: boolean) =>
  (target.getBoundingClientRect().top - main.getBoundingClientRect().top) / viewScale(main) -
  (centered ? Math.max((main.clientHeight - target.offsetHeight) / 2, 0) : 0);

// 끝까지 내려도 닿지 않는 위치면 실제로 움직이지 않아 scrollend가 오지 않으므로 갈 수 있는 끝으로 맞춤
export const alignedScrollTop = (main: HTMLElement, target: HTMLElement, centered: boolean) =>
  Math.max(
    0,
    Math.min(
      main.scrollTop + alignDistance(main, target, centered),
      main.scrollHeight - main.clientHeight,
    ),
  );

// distance 방향으로 더 스크롤할 수 있는 여유
export const scrollRoom = (main: HTMLElement, distance: number) =>
  distance > 0 ? main.scrollHeight - main.clientHeight - main.scrollTop : main.scrollTop;
