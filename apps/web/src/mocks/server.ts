import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** 테스트용 가짜 서버(Node), vitest.setup.ts에서 시작과 초기화 */
export const server = setupServer(...handlers);
