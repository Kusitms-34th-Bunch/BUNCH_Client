// ponytail: 메모리 보관이라 새로고침하면 사라짐. 번들 API(구현 단위 10)를 연결하면 피드·상세 query 캐시로 대체
type Edits = { deleted: ReadonlySet<string>; memberOnly: ReadonlyMap<string, boolean> };

let edits: Edits = { deleted: new Set(), memberOnly: new Map() };
const listeners = new Set<() => void>();
const update = (next: Edits) => {
  edits = next;
  listeners.forEach((listener) => listener());
};

/** 화면에서 지운 번들과 바꾼 공개 범위(피드·상세가 같은 값을 봄) */
export const bundleEdits = {
  read: () => edits,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  remove: (bundleId: string) => update({ ...edits, deleted: new Set(edits.deleted).add(bundleId) }),
  setMemberOnly: (bundleId: string, memberOnly: boolean) =>
    update({ ...edits, memberOnly: new Map(edits.memberOnly).set(bundleId, memberOnly) }),
  /** 테스트 사이에 상태를 비움 */
  clear: () => update({ deleted: new Set(), memberOnly: new Map() }),
};
