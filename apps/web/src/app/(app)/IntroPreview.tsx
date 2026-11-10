'use client';

import { useState } from 'react';
import { IntroScreen } from '@/features/auth/components';

/** 인트로 확인용 임시 진입점: /intro는 로그인한 사용자를 바로 보내므로 이 자리에서 띄움. AppFrame을 덮으므로 Safe Area를 직접 비우고, 브랜드 장면이면 AppFrame처럼 바깥까지 파랗게 칠함 */
export function IntroPreview() {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="bg-surface-primary has-data-[app-background=brand]:bg-surface-brand fixed inset-0 z-50 flex flex-col pt-(--safe-area-top) pr-(--safe-area-right) pb-(--safe-area-bottom) pl-(--safe-area-left) motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out motion-safe:has-data-brand-leaving:duration-350 motion-safe:has-data-brand-leaving:ease-[cubic-bezier(0.45,0,0.55,1)] motion-safe:has-data-[app-background=brand]:delay-200 motion-safe:has-data-[app-background=brand]:duration-550 motion-safe:has-data-[app-background=brand]:ease-in-out">
        <IntroScreen />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="typography-label-l text-text-brand focus-visible:outline-border-brand underline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      인트로 보기 (임시)
    </button>
  );
}
