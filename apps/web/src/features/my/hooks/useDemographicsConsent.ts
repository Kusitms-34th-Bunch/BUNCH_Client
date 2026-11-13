'use client';

import { useCallback, useSyncExternalStore } from 'react';

// 서버에 추가 개인정보(출생연도·성별) 동의 상태 조회·동의·철회 API가 아직 없어(기능명세서 7.4.4·7.4.5, 백엔드 확인 대기)
// UI 확인용으로 이 기기(브라우저)에만 저장하는 임시 값. API가 정해지면 이 hook을 query·mutation으로 바꾸고 이 파일은 지움
const STORAGE_KEY = 'bunch:demographics-consent';
const listeners = new Set<() => void>();

const read = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const write = (agreed: boolean) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(agreed));
  } catch {
    // 저장할 수 없는 환경(사생활 보호 모드 등)이면 이번 화면 방문 동안만 유지되지 않음. 임시 값이라 무시
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * 추가 개인정보 수집·이용 동의 여부와 바꾸는 함수(임시, 이 기기에만 저장). 처음에는 동의하지 않은 상태
 * 서버 렌더에서는 동의하지 않은 상태로 그리고, 브라우저에서 저장된 값으로 바로 맞춤
 */
export function useDemographicsConsent(): readonly [boolean, (_agreed: boolean) => void] {
  const agreed = useSyncExternalStore(subscribe, read, () => false);
  const setAgreed = useCallback((next: boolean) => write(next), []);
  return [agreed, setAgreed] as const;
}
