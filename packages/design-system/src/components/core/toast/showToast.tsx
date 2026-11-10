'use client';

import { toast as sonnerToast } from 'sonner';
import { cn } from '../../../utils';
import { type ToastAction, type ToastIcon, Toast } from './Toast';

// 노출 시간: Figma 공통 모션(토스트 모션)은 단순 완료 안내 3초, 액션 버튼 포함 5초
const DEFAULT_DURATION = 3000;
const ACTION_DURATION = 5000;

// 앱이 화면 요소에 `data-toast-anchor`를 달면 토스트가 그 위에 놓임. 값마다 요소 위 끝과 토스트 아래 끝 사이 간격(px)이 다름
// wrapper: 화면 하단 고정 영역(버튼·입력란) 바로 위 4px, tab-bar: 하단 탭 막대 영역 위 16px
const ANCHOR_GAPS: Record<string, number> = { wrapper: 4, 'tab-bar': 16 };
const ANCHOR_INSET_VAR = '--toast-anchor-inset';

/**
 * 보이는 앵커 중 가장 높은 위 끝까지 화면 아래에서의 거리(+간격)를 CSS 변수로 올려 Toaster가 아래 여백에 쓰게 함
 * 토스트를 띄우는 순간 재므로 키보드·입력란 줄 수·화면 전환 뒤 위치가 그대로 반영됨. 앵커가 없으면 변수를 지워 기본 위치(Safe Area + 16px)를 씀
 * 화면 전환 중 나가는 화면(`inert`)과 숨겨진(크기 0) 요소는 건너뜀
 */
const syncAnchorInset = () => {
  let inset = 0;
  for (const anchor of document.querySelectorAll<HTMLElement>('[data-toast-anchor]')) {
    const gap = ANCHOR_GAPS[anchor.dataset.toastAnchor ?? ''];
    if (gap === undefined || anchor.closest('[inert]')) continue;
    const { top, width, height } = anchor.getBoundingClientRect();
    if (width === 0 || height === 0) continue;
    inset = Math.max(inset, window.innerHeight - top + gap);
  }
  const root = document.documentElement;
  if (inset > 0) root.style.setProperty(ANCHOR_INSET_VAR, `${inset}px`);
  else root.style.removeProperty(ANCHOR_INSET_VAR);
};

export type ToastOptions = {
  icon?: ToastIcon | undefined;
  action?: ToastAction | undefined;
  /** 자동으로 닫히는 시간(ms). `Infinity`면 자동 닫힘 없음 */
  duration?: number | undefined;
  /** 기본은 목록 폭(화면 폭 − 좌우 여백)으로 펼침(글자는 왼쪽, 액션 버튼은 오른쪽 끝). `false`면 내용 폭으로 가운데 */
  fullWidth?: boolean | undefined;
  /** 뜨는 자리. 기본은 아래(`bottom`)이고 `top`은 헤더 바로 아래(Figma 사진 캡션 화면처럼 입력 중 키보드에 가리지 않아야 할 때) */
  position?: 'top' | 'bottom' | undefined;
};

/** 토스트 표시. 새 토스트는 이전 토스트를 대체해 노출 시간을 처음부터 다시 계산 */
export const toast = (
  message: string,
  { icon, action, duration, fullWidth = true, position = 'bottom' }: ToastOptions = {},
) => {
  sonnerToast.dismiss();
  syncAnchorInset();
  // 같은 동작에서 화면 상태를 바꾸고(탭 막대가 다시 나타남 등) 토스트를 부르면 DOM이 아직 옛 상태이므로, 반영된 다음 프레임에 한 번 더 잼
  requestAnimationFrame(syncAnchorInset);

  sonnerToast.custom(
    (toastId) => (
      <Toast
        // Toaster가 항목을 목록 폭(w-full)으로 펴 두므로, 내용 폭이면 Toast를 그 안에서 가운데 정렬
        className={cn('pointer-events-auto', fullWidth ? 'w-full' : 'mx-auto')}
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
    {
      duration: duration ?? (action ? ACTION_DURATION : DEFAULT_DURATION),
      position: position === 'top' ? 'top-center' : 'bottom-center',
    },
  );
};
