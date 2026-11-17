import 'server-only';

type Entry = { count: number; resetAt: number };

type RateLimiterOptions = {
  /** 한 창(window) 안에서 허용하는 요청 수 */
  limit: number;
  windowMs: number;
  /** 보관하는 키 수의 상한(넘으면 만료된 키부터, 그래도 많으면 가장 오래된 키부터 비움) */
  maxKeys: number;
};

/**
 * 키(사용자·IP)별 호출 제한: 고정 창 방식, 서버 인스턴스마다 따로 세는 최선 노력 제한
 * 인스턴스가 여러 개이거나 다시 뜨면 세는 값이 나뉘거나 초기화되므로 정확한 상한이 아니라 남용을 줄이는 용도
 */
export const createRateLimiter = ({ limit, windowMs, maxKeys }: RateLimiterOptions) => {
  const hits = new Map<string, Entry>();
  // 만료된 키를 훑는 일은 창마다 한 번만 함(가득 찬 채로 새 키가 계속 들어와도 요청마다 전체를 훑지 않게)
  let lastSweepAt = Number.NEGATIVE_INFINITY;

  const makeRoom = (now: number) => {
    if (hits.size < maxKeys) return;
    if (now - lastSweepAt >= windowMs) {
      lastSweepAt = now;
      for (const [key, entry] of hits) {
        if (entry.resetAt <= now) hits.delete(key);
      }
    }
    // 그래도 가득 차면 가장 먼저 들어온 키부터 밀어냄(Map은 넣은 순서를 유지, 밀려난 키는 처음부터 다시 셈하므로 제한이 느슨해질 뿐 사용자를 막지 않음)
    while (hits.size >= maxKeys) {
      const oldest = hits.keys().next().value;
      if (oldest === undefined) break;
      hits.delete(oldest);
    }
  };

  return {
    /** 허용하면 undefined, 막으면 다시 시도할 수 있을 때까지 남은 초(올림) */
    check: (key: string, now: number = Date.now()): number | undefined => {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        makeRoom(now);
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return undefined;
      }
      if (entry.count >= limit) return Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      entry.count += 1;
      return undefined;
    },
    /** 테스트에서 키 사이에 값이 새지 않도록 비움 */
    clear: () => hits.clear(),
  };
};
