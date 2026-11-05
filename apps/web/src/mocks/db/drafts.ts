import { mockDb } from './index';

/** 가짜 DB의 초안 번들(시작 데이터의 기존 발행 번들은 제외), 테스트에서 방금 만든 초안을 찾는 용도 */
export const mockDrafts = () => mockDb.get().bundles.filter((bundle) => bundle.status === 'DRAFT');
