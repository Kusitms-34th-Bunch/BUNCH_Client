'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { cn } from '../../../utils';

// 아래 여백: Safe Area + 16px. --safe-area-bottom은 앱이 정의하고, 없으면 env() 사용(docs/architecture/mobile-shell.md)
const BOTTOM_OFFSET =
  'calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + var(--spacing-s8))';

// Figma 공통 모션(토스트 모션): Smart animation, easing 0, 0, 0.35, 1, 350ms, 5px 이동 + 투명도 0%↔100%
// sonner는 --y 변수와 transition으로 움직이므로 항목(li)에서 같은 변수와 transition을 !important로 덮어씀
// 퇴장은 sonner가 제거 표시 200ms 뒤에 항목을 없애서 350ms를 다 못 쓰고 중간에 끊기므로(실측: 투명도 0.19에서 갑자기 사라짐) 같은 곡선으로 200ms에 끝나게 함
// 동작 줄이기에서는 이동·높이 전환을 빼고 투명도 전환만 남김(sonner 기본 CSS의 전환 비활성을 !important가 덮으므로 transition 목록도 따로 줄임)
// Tailwind가 소스에서 클래스를 정적으로 찾으므로 문자열을 보간하지 않고 그대로 씀
const TOAST_MOTION = cn(
  '[transition:transform_350ms_cubic-bezier(0,0,0.35,1),opacity_350ms_cubic-bezier(0,0,0.35,1),height_350ms_cubic-bezier(0,0,0.35,1)]!',
  'data-[removed=true]:[transition:transform_200ms_cubic-bezier(0,0,0.35,1),opacity_200ms_cubic-bezier(0,0,0.35,1),height_200ms_cubic-bezier(0,0,0.35,1)]!',
  'data-[mounted=false]:[--y:translateY(5px)]! data-[removed=true]:[--y:translateY(5px)]!',
  'motion-reduce:[transition:opacity_350ms_cubic-bezier(0,0,0.35,1)]! motion-reduce:data-[removed=true]:[transition:opacity_200ms_cubic-bezier(0,0,0.35,1)]!',
  'motion-reduce:data-[mounted=false]:[--y:translateY(0)]! motion-reduce:data-[removed=true]:[--y:translateY(0)]!',
);

/** 화면을 그리는 앱의 최상위 layout에 한 번만 배치 */
export const Toaster = () => (
  <SonnerToaster
    position="bottom-center"
    visibleToasts={1}
    offset={{ bottom: BOTTOM_OFFSET }}
    mobileOffset={{ bottom: BOTTOM_OFFSET }}
    // 항목(li)을 목록 폭으로 펴서 안의 Toast를 내용 폭으로 가운데 정렬
    toastOptions={{ unstyled: true, className: cn('w-full', TOAST_MOTION) }}
    customAriaLabel="알림"
  />
);
