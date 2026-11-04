import type { BunchSummary } from './types';

/** 번치 전환 시트의 항목 상태: 들어갈 수 없는 번치, 지금 번치, 나머지 */
export function switchStatus(bunch: Pick<BunchSummary, 'id' | 'access'>, currentId: string) {
  if (bunch.access !== 'active') return 'unavailable';
  if (bunch.id === currentId) return 'current';
  return 'default';
}
