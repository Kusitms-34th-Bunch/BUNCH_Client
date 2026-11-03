/** 가짜 DB 상태를 새로고침 뒤에도 남기는 저장소 */
export type StorageAdapter = {
  read: (_key: string) => Promise<unknown>;
  write: (_key: string, _value: unknown) => Promise<void>;
};

const DB_NAME = 'bunch-mock';
const STORE_NAME = 'state';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB를 열지 못함'));
  });

const transact = async <T>(
  mode: IDBTransactionMode,
  run: (_store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB 요청 실패'));
    });
  } finally {
    db.close();
  }
};

// IndexedDB를 쓸 수 없는 환경(테스트 등)은 undefined라 메모리만 사용
export const indexedDbStorage: StorageAdapter | undefined =
  typeof indexedDB === 'undefined'
    ? undefined
    : {
        read: (key) => transact('readonly', (store) => store.get(key)),
        write: async (key, value) => {
          await transact('readwrite', (store) => store.put(value, key));
        },
      };
