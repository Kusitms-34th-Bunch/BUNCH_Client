import type { MockDbState } from './types';
import { createMockDb } from './createMockDb';
import { createSeedFor } from './seed';

// E2E·시연에서 시작 세션을 고르는 키(값은 `createSeedFor` 참고). 저장된 DB가 없을 때 시작 데이터를 만들 때만 읽음
const MOCK_SESSION_KEY = 'bunch:mock-session';

const readMockSession = () => {
  try {
    return window.localStorage.getItem(MOCK_SESSION_KEY);
  } catch {
    return null;
  }
};

// 모든 handler가 함께 쓰는 데이터, 저장 형태가 바뀌면 키의 버전 상향
export const mockDb = createMockDb<MockDbState>({
  key: 'mock-db:v20',
  seed: () => createSeedFor(readMockSession()),
});
