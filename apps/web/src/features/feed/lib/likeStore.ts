// ponytail: 메모리 보관이라 새로고침하면 사라짐. 좋아요 API(구현 단위 10)를 연결하면 피드·상세 query 캐시로 대체
type Overrides = ReadonlyMap<string, Readonly<Record<string, boolean>>>;

let overrides: Overrides = new Map();
const listeners = new Set<() => void>();

/** 번치별로 화면에서 바꾼 좋아요(번치 ID → 번들 ID → 좋아요 여부) */
export const likeStore = {
  read: () => overrides,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set: (bunchId: string, bundleId: string, liked: boolean) => {
    const next = new Map(overrides);
    next.set(bunchId, { ...next.get(bunchId), [bundleId]: liked });
    overrides = next;
    listeners.forEach((listener) => listener());
  },
  /** 테스트 사이에 상태를 비움 */
  clear: () => {
    overrides = new Map();
    listeners.forEach((listener) => listener());
  },
};
