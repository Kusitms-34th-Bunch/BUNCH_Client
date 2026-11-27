// 아래쪽 네이티브 UI(시스템 탭 바·플로팅 버튼) 자리를 가릴 수 있는 것: 움직이는 화면 sheet(AppTransitions guardSheet), 전환 중 나가는 화면, 닫히는 중인 바텀시트·대화상자
const COVER_SELECTOR =
  '[data-sheet-moving], [data-page-leaving], [role="dialog"][data-ending-style], [role="alertdialog"][data-ending-style]';
// 기다리는 최대 시간(멈춘 전환·남은 표식에도 네이티브 UI가 영영 숨지 않게)
const COVER_WAIT_MS = 1000;
// 탭 바 자리(화면 아래 15%)를 이 비율 넘게 덮는 것이 있으면 기다림
const TAB_BAR_ZONE_RATIO = 0.15;
const COVER_THRESHOLD = 0.2;
// 흐려지기 시작한 나가는 화면은 덮지 않은 것으로 봄(상세에서 돌아오는 hero는 제자리에서 흐려지기만 함, #532)
// 절반(0.5)까지 기다리면 뒤 화면이 비치기 시작하고 약 140ms 뒤에 나와 늦어 보였음(CPU 4배 측정, #568)
const FADED_OPACITY = 0.95;

/** 조상까지 곱한 실제 투명도(값이 없으면 1) */
const visibleOpacity = (element: Element) => {
  let opacity = 1;
  for (
    let node: Element | null = element;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const value = Number.parseFloat(getComputedStyle(node).opacity);
    if (!Number.isNaN(value)) opacity *= value;
  }
  return opacity;
};

/**
 * 쉘의 네이티브 UI는 웹 위에 그려져 웹 화면 아래로 내릴 수 없어, 다시 보일 때 그 자리를 덮던 것이 비켜난 뒤에 보임
 * (스프링·전환이 다 끝나기를 기다리지 않고 실제 위치·투명도로 판단)
 */
const somethingCoversBottom = () => {
  const zoneTop = window.innerHeight * (1 - TAB_BAR_ZONE_RATIO);
  const zoneArea = window.innerWidth * (window.innerHeight - zoneTop);
  if (zoneArea <= 0) return false;
  return [...document.querySelectorAll(COVER_SELECTOR)].some((element) => {
    const rect = element.getBoundingClientRect();
    const width = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const height = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, zoneTop);
    return (
      width > 0 &&
      height > 0 &&
      (width * height) / zoneArea > COVER_THRESHOLD &&
      // 바텀시트는 내려가며 함께 흐려져 반쯤 남은 채 투명도가 먼저 떨어지므로 나가는 화면에만 적용
      !(element.hasAttribute('data-page-leaving') && visibleOpacity(element) <= FADED_OPACITY)
    );
  });
};

/** 다음 프레임부터 아래쪽이 비켜나면(최대 1초) `run`을 부름. 돌려준 함수로 취소 */
export function afterBottomUncovered(run: () => void) {
  const startedAt = performance.now();
  let frame = 0;
  const check = () => {
    if (somethingCoversBottom() && performance.now() - startedAt < COVER_WAIT_MS) {
      frame = requestAnimationFrame(check);
      return;
    }
    run();
  };
  // 전환이 시작될(표식이 붙을) 한 프레임 뒤부터 확인
  frame = requestAnimationFrame(check);
  return () => cancelAnimationFrame(frame);
}
