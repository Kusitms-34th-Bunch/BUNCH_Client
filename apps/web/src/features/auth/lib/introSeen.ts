// 앱 데이터(WebView 저장소)라 앱을 지우면 함께 지워져 다시 설치하면 인트로가 다시 보임
// iOS Keychain(expo-secure-store)은 재설치 뒤에도 남으므로 쓰지 않음
const KEY = 'bunch:intro-seen';
// 저장(용량 초과 등)만 실패해도 이번 실행에서는 본 것으로 봐서 로그인 화면이 다시 인트로로 돌아가지 않게
let seenThisRun = false;

/** 인트로를 본 적이 있는지. 저장소를 쓸 수 없으면 본 것으로 취급(인트로를 반복해서 띄우지 않게) */
export function readIntroSeen() {
  try {
    return seenThisRun || window.localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
}

export function markIntroSeen() {
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    seenThisRun = true;
    // 저장하지 못해도 이번 이동은 그대로 진행
  }
}
