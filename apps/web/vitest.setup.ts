import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { mockDb } from './src/mocks/db';
import { resetIdempotency } from './src/mocks/lib/idempotency';
import { server } from './src/mocks/server';

// 테스트는 가짜 서버(MSW) 위에서 도는 환경이라 가짜 서버 전용 구현(편집권 통로 등)을 켬
process.env.NEXT_PUBLIC_API_MOCKING = 'enabled';

// handler가 없는 요청은 실제 네트워크로 나가지 않고 테스트 실패 처리
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
// 테스트 간 영향 차단을 위한 handler 덮어쓰기, 가짜 DB, 멱등 키 초기화
afterEach(() => {
  server.resetHandlers();
  mockDb.reset();
  resetIdempotency();
});
afterAll(() => server.close());
