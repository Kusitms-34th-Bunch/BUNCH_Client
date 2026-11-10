import * as SplashScreen from 'expo-splash-screen';

// 웹 첫 화면이 끝내 뜨지 않아도(네트워크 지연 등) 스플래시에 갇히지 않게 닫는 시간
const FALLBACK_MS = 5000;

// 네이티브 스플래시(파란 배경)는 애니메이션 화면이 같은 색으로 덮은 뒤 닫음
// 공식 문서 권장대로 모듈 범위에서 기다리지 않고 호출
SplashScreen.preventAutoHideAsync().catch(() => {});

let webReady = false;
const listeners = new Set<() => void>();

/** 웹 첫 페이지를 다 불러옴(실패해 오류 화면이 떠도). 여러 WebView(탭)가 불러도 한 번만 알림 */
export function markWebReady() {
  if (webReady) return;
  webReady = true;
  listeners.forEach((listener) => listener());
  listeners.clear();
}

/** 웹 준비를 기다림. 이미 준비됐으면 바로 부름. 반환값은 구독 해제 */
export function onWebReady(listener: () => void) {
  if (webReady) {
    listener();
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let nativeHidden = false;

/** 네이티브 스플래시를 한 번만 닫음(같은 파란 화면이 이미 덮고 있어 페이드 없이) */
export function hideNativeSplash() {
  if (nativeHidden) return;
  nativeHidden = true;
  SplashScreen.hide();
}

setTimeout(markWebReady, FALLBACK_MS);
