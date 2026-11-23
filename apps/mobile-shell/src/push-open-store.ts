import type { PushOpen } from './push-open-core';

// 웹이 가져가지 못하면(로그인 확인 중 등) 이 시간 뒤에 버림. 나중에 엉뚱한 때 지난 알림으로 이동하지 않게
const MAX_AGE_MS = 60_000;

let pending: { value: PushOpen; receivedAt: number } | null = null;
let lastId: string | null = null;

/**
 * 푸시를 눌러 연 알림 한 건. 쉘이 넣고(`push-open.ts`), 화면에 보이는 WebView의 웹이 `takeOpenedPush`로 한 번 가져감
 * 같은 응답(알림 identifier)을 두 번 받으면(처음 실행의 마지막 응답과 리스너) 한 번만 넣음
 */
export const pushOpenStore = {
  set: (id: string, value: PushOpen, now = Date.now()) => {
    if (id === lastId) return false;
    lastId = id;
    pending = { value, receivedAt: now };
    return true;
  },
  take: (now = Date.now()) => {
    const taken = pending;
    pending = null;
    if (!taken || now - taken.receivedAt > MAX_AGE_MS) return null;
    return taken.value;
  },
};
