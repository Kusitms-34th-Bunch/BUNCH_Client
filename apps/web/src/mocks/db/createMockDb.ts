import { indexedDbStorage, type StorageAdapter } from './storage';

// 변경 후 이 시간 동안 조용하면 저장(연속 변경 중 매번 쓰기 방지)
const PERSIST_DELAY_MS = 300;

export type MockDb<T> = {
  get: () => T;
  /** 현재 값을 고치지 않고 새 값을 반환하는 변경 함수 */
  update: (_change: (_current: T) => T) => void;
  /** 시작값으로 복귀, 저장이 켜져 있으면 저장된 값도 시작값으로 교체 */
  reset: () => void;
  /** 저장된 상태를 읽어 이어서 시작하고 이후 변경을 저장, 브라우저에서 화면보다 먼저 1회 호출 */
  hydrate: () => Promise<void>;
};

type MockDbOptions<T> = {
  /** 저장 형태가 바뀌면 키의 버전을 올려 옛 저장값 사용 방지 */
  key: string;
  seed: () => T;
  storage?: StorageAdapter | undefined;
};

/** 가짜 백엔드 데이터 저장소, 평소에는 메모리만 쓰고 hydrate 이후 IndexedDB에 이어 저장(구조화 복제 가능한 값만 보관) */
export function createMockDb<T>({
  key,
  seed,
  storage = indexedDbStorage,
}: MockDbOptions<T>): MockDb<T> {
  let state: T | undefined;
  let persisting = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let listening = false;

  const get = () => (state ??= seed());

  const flush = async () => {
    clearTimeout(timer);
    timer = undefined;
    if (!persisting || !storage) return;
    try {
      await storage.write(key, get());
    } catch {
      // 저장에 실패해도 화면 동작은 유지(새로고침 시 시작값 복귀)
    }
  };

  const schedule = () => {
    if (!persisting) return;
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), PERSIST_DELAY_MS);
  };

  return {
    get,
    update: (change) => {
      state = change(get());
      schedule();
    },
    reset: () => {
      state = undefined;
      schedule();
    },
    hydrate: async () => {
      if (!storage) return;
      persisting = true;
      try {
        const stored = await storage.read(key);
        if (stored !== undefined) state = stored as T;
      } catch {
        // 읽기에 실패하면 시작값으로 시작
      }
      if (!listening && typeof window !== 'undefined') {
        listening = true;
        // 탭을 닫거나 앱을 내리기 직전에 미저장 변경 즉시 저장
        window.addEventListener('pagehide', () => void flush());
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') void flush();
        });
      }
    },
  };
}
