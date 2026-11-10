import { toast, type ToastOptions } from '@app/design-system';

type PendingToast = {
  message: string;
  options: ToastOptions | undefined;
  /** 예약한 화면의 경로. 경로가 바뀌어야 도착한 것으로 봄 */
  fromPath: string;
  /** 경로가 바뀌지 않으면(이동 실패·취소) 한참 뒤 엉뚱한 화면에 뜨지 않도록 버리는 시각. 경로가 바뀐 뒤에는 적용하지 않음 */
  expiresAt: number;
};

const EXPIRES_MS = 5000;

let pending: PendingToast | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export const subscribePendingToast = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getPendingToast = () => pending;

/**
 * 화면을 이동하는 동작의 결과 토스트 예약. 도착 화면의 전환과 로딩이 끝난 뒤 도착 화면 기준 위치에 뜸(`PendingToast`가 담당)
 * 이동하지 않는 동작은 예약 없이 `toast()`를 바로 부름. 새 예약은 이전 예약을 대체
 */
export const toastAfterNavigation = (message: string, options?: ToastOptions) => {
  pending = {
    message,
    options,
    fromPath: window.location.pathname,
    expiresAt: Date.now() + EXPIRES_MS,
  };
  emit();
};

/** 예약을 비우고, `show`이면 지금 토스트로 띄움 */
export const settlePendingToast = (show: boolean) => {
  const current = pending;
  if (!current) return;
  pending = null;
  emit();
  if (show) toast(current.message, current.options);
};
