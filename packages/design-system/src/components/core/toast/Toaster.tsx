'use client';

import { Toaster as SonnerToaster } from 'sonner';

// 아래 여백: Safe Area + 16px. --safe-area-bottom은 앱이 정의하고, 없으면 env() 사용(docs/architecture/mobile-shell.md)
const BOTTOM_OFFSET =
  'calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + var(--spacing-s8))';

/** 화면을 그리는 앱의 최상위 layout에 한 번만 배치 */
export const Toaster = () => (
  <SonnerToaster
    position="bottom-center"
    visibleToasts={1}
    offset={{ bottom: BOTTOM_OFFSET }}
    mobileOffset={{ bottom: BOTTOM_OFFSET }}
    // 항목(li)을 목록 폭으로 펴서 안의 Toast를 내용 폭으로 가운데 정렬
    toastOptions={{ unstyled: true, className: 'w-full' }}
    customAriaLabel="알림"
  />
);
