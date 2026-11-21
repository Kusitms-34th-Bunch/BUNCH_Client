type Listener = () => void;

// 받은 링크를 그때 열지 못하면(보이는 WebView가 없던 순간) 이 시간 뒤에는 버림
// 나중에 첫 화면이 다시 생길 때(로그아웃 등) 지난 초대가 갑자기 열리지 않게. 처음 실행의 첫 화면은 이 안에 그려짐
const MAX_AGE_MS = 10_000;

let link: { path: string; receivedAt: number } | null = null;
const listeners = new Set<Listener>();

/**
 * 앱을 연 초대 링크의 웹 경로(`/invite/{토큰}`). `app/+native-intent.tsx`가 넣고, 지금 보이는 WebView가 열고 비움
 * 처음 실행은 첫 화면이 이 경로로 WebView를 열고, 실행 중이면 보이는 WebView가 그 경로로 이동
 */
export const incomingLinkStore = {
  get: (now = Date.now()) => {
    if (!link) return null;
    return now - link.receivedAt <= MAX_AGE_MS ? link.path : null;
  },
  set: (path: string, now = Date.now()) => {
    link = { path, receivedAt: now };
    listeners.forEach((listener) => listener());
  },
  /** 연 값만 비움(그 사이 새 링크가 들어왔으면 그대로 둠) */
  clear: (opened: string) => {
    if (link?.path !== opened) return;
    link = null;
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
