import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 이번 실행의 기억값이 모듈에 남으므로 테스트마다 새로 불러옴
const load = () => import('./introSeen');

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('introSeen', () => {
  it('처음에는 본 적 없고, 기록하면 본 것으로 남는다', async () => {
    const { markIntroSeen, readIntroSeen } = await load();
    expect(readIntroSeen()).toBe(false);
    markIntroSeen();
    expect(readIntroSeen()).toBe(true);
  });

  it('저장만 실패해도 이번 실행에서는 본 것으로 본다(로그인 화면이 다시 인트로로 돌아가지 않게)', async () => {
    const { markIntroSeen, readIntroSeen } = await load();
    // 읽기는 되고 쓰기만 실패하는 저장소(용량 초과 등)
    const setItem = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem });
    expect(readIntroSeen()).toBe(false);
    markIntroSeen();
    // 가짜 저장소에 쓰려다 실패했는지(실제 저장소에 써져 통과한 게 아닌지) 확인
    expect(setItem).toHaveBeenCalledOnce();
    expect(readIntroSeen()).toBe(true);
  });
});
