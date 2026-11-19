/**
 * 스플래시를 닫을 신호를 한 번만 통과시키는 문
 * 첫 화면 → 탭 화면으로 넘어가는 동안은 곧 버려질 첫 화면 WebView의 신호를 무시하고, 탭 WebView가 불러오기 시작한 뒤의 신호만 받음
 */
export function createReadyGate(onReady: () => void) {
  let done = false;
  let waitingForTabs = false;
  const finish = () => {
    if (done) return;
    done = true;
    onReady();
  };
  return {
    /** 웹이 도착 화면을 그림(탭 화면으로 넘어가는 중이면 무시) */
    ready: () => {
      if (!waitingForTabs) finish();
    },
    /** 탭 화면으로 넘어가는 중이어도 닫음(안전장치 시간, WebView 로드 실패) */
    force: finish,
    /** 첫 화면에서 탭 화면으로 넘어감(이미 닫혔으면 무시) */
    waitForTabs: () => {
      if (!done) waitingForTabs = true;
    },
    /** 탭 WebView가 불러오기 시작함 */
    tabLoading: () => {
      waitingForTabs = false;
    },
  };
}
