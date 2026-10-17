'use client';

import { toast as sonnerToast } from 'sonner';
import { type ToastAction, type ToastIcon, Toast } from './Toast';

// 지속 시간: 기획 명세의 오류 토스트 3초, 「공유」 버튼이 있는 복사 완료 토스트 5초(Toast.spec.md 확인할 항목)
const DEFAULT_DURATION = 3000;
const ACTION_DURATION = 5000;

export type ToastOptions = {
  icon?: ToastIcon | undefined;
  action?: ToastAction | undefined;
  /** 자동으로 닫히는 시간(ms). `Infinity`면 닫히지 않는다. */
  duration?: number | undefined;
};

/** 토스트를 띄운다. 새 토스트는 이전 토스트를 대체해 노출 시간을 처음부터 센다. */
export const toast = (message: string, { icon, action, duration }: ToastOptions = {}) => {
  sonnerToast.dismiss();

  sonnerToast.custom(
    (toastId) => (
      <Toast
        // Toaster가 항목을 목록 폭(w-full)으로 펴 두므로, 내용 폭의 Toast를 그 안에서 가운데에 놓는다
        className="mx-auto"
        icon={icon}
        action={
          action && {
            label: action.label,
            onClick: () => {
              action.onClick();
              sonnerToast.dismiss(toastId);
            },
          }
        }
      >
        {message}
      </Toast>
    ),
    { duration: duration ?? (action ? ACTION_DURATION : DEFAULT_DURATION) },
  );
};
