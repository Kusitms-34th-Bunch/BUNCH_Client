/**
 * 픽 화면이 서버에 보낼 「원하는 최종 상태」와 진행 중인 저장을 화면(hook 인스턴스) 밖에서 번들·사진별로 하나씩만 둠
 * 화면을 나갔다 다시 들어와도 같은 사진에는 저장 루프가 하나뿐이고, 새 화면의 누름이 같은 희망 상태를 갱신함
 * (인스턴스마다 따로 두면 옛 루프가 새 화면의 마지막 선택을 낡은 희망 상태로 덮을 수 있음)
 */
const intents = new Map<string, boolean>();
const running = new Set<string>();
const listeners = new Set<() => void>();
let snapshot: Readonly<Record<string, boolean>> = {};

const keyOf = (bundleId: string, photoId: string) => `${bundleId}:${photoId}`;

const emit = () => {
  snapshot = Object.fromEntries(intents);
  for (const listener of listeners) listener();
};

export const pickIntents = {
  /** 번들 id가 앞에 붙은 키로 된 희망 상태 전체(변할 때만 새 객체) */
  getSnapshot: () => snapshot,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  keyOf,
  get: (bundleId: string, photoId: string) => intents.get(keyOf(bundleId, photoId)),
  set: (bundleId: string, photoId: string, picked: boolean) => {
    intents.set(keyOf(bundleId, photoId), picked);
    emit();
  },
  clear: (bundleId: string, photoId: string) => {
    if (intents.delete(keyOf(bundleId, photoId))) emit();
  },
  /** 이 사진의 저장 루프를 시작해도 되면 true, 이미 돌고 있으면 false(돌고 있는 루프가 새 희망 상태를 이어서 보냄) */
  begin: (bundleId: string, photoId: string) => {
    const key = keyOf(bundleId, photoId);
    if (running.has(key)) return false;
    running.add(key);
    return true;
  },
  end: (bundleId: string, photoId: string) => {
    running.delete(keyOf(bundleId, photoId));
  },
  /** 테스트에서 번들 사이에 상태가 새지 않도록 비움 */
  reset: () => {
    intents.clear();
    running.clear();
    emit();
  },
};
