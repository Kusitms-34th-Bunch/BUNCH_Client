import type { MockDbState } from './types';
import { createMockDb } from './createMockDb';
import { createSeed } from './seed';

// 모든 handler가 함께 쓰는 데이터, 저장 형태가 바뀌면 키의 버전 상향
export const mockDb = createMockDb<MockDbState>({ key: 'mock-db:v9', seed: createSeed });
