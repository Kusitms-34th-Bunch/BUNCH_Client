'use client';

import { Toaster as SonnerToaster } from 'sonner';

// 아래 여백: Safe Area + 16px. --safe-area-bottom은 앱이 정의하고, 없으면 env()를 쓴다(docs/architecture/mobile-shell.md)
const BOTTOM_OFFSET =
  'calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + var(--spacing-s8))';

/** 앱 최상위에 한 번만 둔다. */
export const Toaster = () => (
  <SonnerToaster
    position="bottom-center"
    visibleToasts={1}
    offset={{ bottom: BOTTOM_OFFSET }}
    mobileOffset={{ bottom: BOTTOM_OFFSET }}
    // 항목(li)을 목록 폭으로 펴서 안의 Toast가 내용 폭으로 가운데에 놓이게 한다
    toastOptions={{ unstyled: true, className: 'w-full' }}
    customAriaLabel="알림"
  />
);
