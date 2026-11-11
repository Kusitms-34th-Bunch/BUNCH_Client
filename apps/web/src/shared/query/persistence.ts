import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { type Query, type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';

/**
 * 쿼리 캐시 영속화(docs/architecture/data-layer.md 「캐시 영속화」)
 * `persistedQuery`를 펼친 성공한 query만 localStorage에 남겨, 앱을 다시 열면 지난 데이터를 먼저 보이고 뒤에서 새로 받음
 * 로그인 상태(session)·기본 번치(`members/me`)는 저장하지 않음: 접근 판단과 어느 번치를 볼지는 항상 서버 응답으로 정함
 */
const STORAGE_PREFIX = 'bunch-query-cache:';

/** 저장본 최대 보관 시간(24시간). 지나면 복원하지 않음 */
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * 저장할 query의 옵션. 메모리에서 지워지면 저장본에서도 빠지므로 메모리 보관 시간(gcTime)도 저장 기간만큼 늘림
 * 앱을 열자마자 보이는 화면의 데이터에만 씀
 */
export const persistedQuery = { meta: { persist: true }, gcTime: PERSIST_MAX_AGE } as const;

/**
 * 배포(빌드)마다 바뀌는 값. 다르면 저장본을 버려 이전 배포의 데이터 모양이 복원되지 않게 함
 * 가짜 서버 여부도 넣어 가짜 데이터와 실서버 데이터가 섞여 복원되지 않게 함
 */
export const PERSIST_BUSTER = `${process.env.NEXT_PUBLIC_APP_BUILD ?? ''}:${process.env.NEXT_PUBLIC_API_MOCKING ?? ''}`;

// 서버 렌더와 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)은 undefined라 persister가 아무것도 하지 않음
const readStorage = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

// 처음 연 화면의 첫 경로 조각(bunch·feed·photos·my, `/`는 빈 값)별로 따로 저장
// 앱 쉘의 탭 WebView 4개가 같은 origin이라, 한 키를 쓰면 각자 가진 query만으로 서로 덮어씀
const entryKey = () =>
  `${STORAGE_PREFIX}${typeof window === 'undefined' ? '' : (window.location.pathname.split('/')[1] ?? '')}`;

// 저장본을 지운 뒤에는 회원이 다시 확인될 때까지 쓰지 않음(throttle로 늦게 오는 이전 회원의 쓰기 포함)
let writesBlocked = false;
const baseStorage = readStorage();
const guardedStorage = baseStorage && {
  getItem: (key: string) => baseStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (!writesBlocked) baseStorage.setItem(key, value);
  },
  removeItem: (key: string) => baseStorage.removeItem(key),
};

const storagePersister = createAsyncStoragePersister({
  storage: guardedStorage,
  key: entryKey(),
  throttleTime: 1000,
});

// 저장본이 누구의 데이터인지. 같은 origin의 다른 탭·WebView가 이전 사용자 데이터를 덮어써도 다음 사용자에게 복원되지 않게 함
type OwnedClient = PersistedClient & { owner?: string };
/** 이 화면(JS 문맥)에서 서버가 확인한 회원 ID. 확인 전(null)에는 저장하지 않고 화면도 그리지 않음 */
let contextOwner: string | null = null;
const ownerListeners = new Set<() => void>();
const setContextOwner = (owner: string | null) => {
  contextOwner = owner;
  ownerListeners.forEach((listener) => listener());
};
const subscribeOwner = (listener: () => void) => {
  ownerListeners.add(listener);
  return () => {
    ownerListeners.delete(listener);
  };
};
const getContextOwner = () => contextOwner;
/** 복원한 저장본의 회원 ID. 복원한 적 없으면 undefined, 주인 표시가 없는 저장본은 null */
let restoredOwner: string | null | undefined;

export const queryPersister: Persister = {
  // 저장을 부른 순간의 회원으로 표시(쓰기가 throttle로 늦어져도 그 사이 바뀐 회원으로 잘못 표시하지 않음)
  persistClient: (client) => {
    const owner = contextOwner;
    if (owner === null) return;
    const owned: OwnedClient = { ...client, owner };
    return storagePersister.persistClient(owned);
  },
  restoreClient: async () => {
    const client = (await storagePersister.restoreClient()) as OwnedClient | undefined;
    if (client) restoredOwner = client.owner ?? null;
    return client;
  },
  removeClient: () => storagePersister.removeClient(),
};

/** 저장 대상: 표시한 query 중 데이터를 받은 것만(오류·로딩 상태는 남기지 않음) */
export const shouldPersistQuery = (query: Query) =>
  query.meta?.persist === true && query.state.status === 'success';

/** 모든 화면의 저장본을 지움(로그아웃·탈퇴 직후, 비로그인 확인) */
export const clearPersistedQueryStorage = () => {
  writesBlocked = true;
  const storage = readStorage();
  if (!storage) return;
  for (const key of Object.keys(storage)) {
    if (key.startsWith(STORAGE_PREFIX)) storage.removeItem(key);
  }
};

const clearPersisted = (queryClient: QueryClient) => {
  queryClient.removeQueries({ predicate: (query) => query.meta?.persist === true });
  clearPersistedQueryStorage();
};

/**
 * 비로그인이 확인되면 이전 사용자의 저장본과 메모리의 저장 대상 query를 지움(세션 만료)
 * 로그아웃·탈퇴는 성공 직후에도 지우고, 앱이 그 사이 종료돼도 다음 실행의 이 확인에서 지워짐
 */
export function useClearPersistedQueriesWhen(anonymous: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!anonymous) return;
    restoredOwner = undefined;
    setContextOwner(null);
    clearPersisted(queryClient);
  }, [anonymous, queryClient]);
}

/**
 * 서버가 확인한 회원을 저장본의 주인으로 맞춤. 맞추기 전에는 false라 화면을 그리지 않음
 * 복원한 저장본이 다른 회원 것(또는 주인 표시 없음)이거나, 이 화면에서 회원이 바뀌었으면 저장 대상 query와 저장본을 지움
 */
export function usePersistedOwnerReady(memberId: string | undefined) {
  const queryClient = useQueryClient();
  const owner = useSyncExternalStore(subscribeOwner, getContextOwner, () => null);
  useLayoutEffect(() => {
    // 같은 회원이어도 그 뒤 다시 복원한 저장본(QueryProvider를 다시 붙임)은 주인을 다시 확인
    if (memberId === undefined || (contextOwner === memberId && restoredOwner === memberId)) return;
    const otherRestored = restoredOwner !== undefined && restoredOwner !== memberId;
    const switched = contextOwner !== null && contextOwner !== memberId;
    if (otherRestored || switched) clearPersisted(queryClient);
    restoredOwner = memberId;
    writesBlocked = false;
    setContextOwner(memberId);
  }, [memberId, queryClient]);
  return memberId !== undefined && owner === memberId;
}
