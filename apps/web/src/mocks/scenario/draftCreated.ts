import type { MockBundle, MockLease } from '../db/types';
import { applyUtStateB } from './utStateB';

/**
 * 초안 생성 handler가 새 초안을 저장하기 직전에 부르는 시나리오 확장점
 * UT 시나리오 코드는 이 폴더에 격리되어 있어, 끝나면 이 호출과 폴더만 지우면 일반 handler 동작으로 돌아감
 */
export const onDraftCreated = (bundle: MockBundle): { bundle: MockBundle; leases: MockLease[] } =>
  applyUtStateB(bundle);
