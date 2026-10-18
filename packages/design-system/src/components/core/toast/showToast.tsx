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
  /** 기본 위치(Safe Area + 16px)에서 더 위로 올리는 간격(px). 화면 아래에 고정 버튼이 있어 토스트가 가리면 안 될 때 쓴다 */
  bottomOffset?: number | undefined;
  /** 내용 폭 대신 목록 폭(화면 폭 − 좌우 여백)으로 편다. 글자는 왼쪽, 액션 버튼은 오른쪽 끝에 놓인다 */
  fullWidth?: boolean | undefined;
};

/** 토스트를 띄운다. 새 토스트는 이전 토스트를 대체해 노출 시간을 처음부터 센다. */
export const toast = (
  message: string,
  { icon, action, duration, bottomOffset, fullWidth }: ToastOptions = {},
) => {
  sonnerToast.dismiss();

  sonnerToast.custom(
    (toastId) => (
      // 아래 여백은 항목 높이에 포함돼야 sonner가 그만큼 위에 놓는다(margin은 높이에 안 잡혀 padding으로 준다)
      <div style={bottomOffset ? { paddingBottom: bottomOffset } : undefined}>
        <Toast
          // Toaster가 항목을 목록 폭(w-full)으로 펴 두므로, 기본은 내용 폭의 Toast를 그 안에서 가운데에 놓는다
          className={fullWidth ? 'w-full' : 'mx-auto'}
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
      </div>
    ),
    { duration: duration ?? (action ? ACTION_DURATION : DEFAULT_DURATION) },
  );
};
