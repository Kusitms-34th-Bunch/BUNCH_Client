import { describe, expect, it, vi } from 'vitest';
import { createListeners } from './listeners';

describe('createListeners', () => {
  it('구독한 함수만 알림을 받고, 해제하면 더 받지 않음', () => {
    const { subscribe, emit } = createListeners();
    const a = vi.fn();
    const b = vi.fn();
    const unsubscribeA = subscribe(a);
    subscribe(b);
    emit();
    unsubscribeA();
    emit();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('알림 중 자기 구독을 해제해도 나머지는 알림을 받음', () => {
    const { subscribe, emit } = createListeners();
    const later = vi.fn();
    const unsubscribe = subscribe(() => unsubscribe());
    subscribe(later);
    emit();
    emit();
    expect(later).toHaveBeenCalledTimes(2);
  });
});
