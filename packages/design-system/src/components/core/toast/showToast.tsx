'use client';

import { toast as sonnerToast } from 'sonner';
import { type ToastAction, type ToastIcon, Toast } from './Toast';

// 노출 시간: Figma 공통 모션(토스트 모션)은 단순 완료 안내 3초, 액션 버튼 포함 5초
const DEFAULT_DURATION = 3000;
const ACTION_DURATION = 5000;

export type ToastOptions = {
  icon?: ToastIcon | undefined;
  action?: ToastAction | undefined;
  /** 자동으로 닫히는 시간(ms). `Infinity`면 자동 닫힘 없음 */
  duration?: number | undefined;
  /** 기본 위치(Safe Area + 16px)에서 더 위로 올리는 간격(px). 화면 아래에 고정 버튼이 있어 토스트가 가리면 안 될 때 사용 */
  bottomOffset?: number | undefined;
  /** 내용 폭 대신 목록 폭(화면 폭 − 좌우 여백)으로 펼침. 글자는 왼쪽, 액션 버튼은 오른쪽 끝 배치 */
  fullWidth?: boolean | undefined;
};

/** 토스트 표시. 새 토스트는 이전 토스트를 대체해 노출 시간을 처음부터 다시 계산 */
export const toast = (
  message: string,
  { icon, action, duration, bottomOffset, fullWidth }: ToastOptions = {},
) => {
  sonnerToast.dismiss();

  sonnerToast.custom(
    (toastId) => (
      // 아래 여백은 sonner가 위치 계산에 쓰도록 항목 높이에 포함(margin은 높이에 안 잡혀 padding 사용)
      <div style={bottomOffset ? { paddingBottom: bottomOffset } : undefined}>
        <Toast
          // Toaster가 항목을 목록 폭(w-full)으로 펴 두므로, 기본은 내용 폭의 Toast를 그 안에서 가운데 정렬
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
