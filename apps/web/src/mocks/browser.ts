import { setupWorker } from 'msw/browser';
import { mockDb } from './db';
import { handlers } from './handlers';
import { failOverrideHandler } from './lib/failOverride';

let starting: Promise<void> | undefined;

async function start() {
  await mockDb.hydrate();
  // E2E가 일부러 실패시킨 요청이 먼저(lib/failOverride)
  const worker = setupWorker(failOverrideHandler, ...handlers);
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: process.env.NODE_ENV === 'production',
  });
}

/**
 * 저장된 DB 상태를 읽은 뒤 서비스 워커로 가짜 서버 시작, StrictMode 이중 실행에도 1회이고 실패 결과도 유지
 * 서비스 워커는 HTTPS·localhost에서만 등록(http IP 접속은 제외, iPhone Expo Go 쉘 WebView에서는 동작 확인)
 */
export const startApiMocking = () => (starting ??= start());
