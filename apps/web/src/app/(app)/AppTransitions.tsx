'use client';

import {
  Ssgoi,
  type SsgoiConfig,
  type SsgoiTransitionRule,
  type MultiAnimation,
} from '@ssgoi/react';
import { fade, slide } from '@ssgoi/react/view-transitions';
import { type ReactNode, useMemo, useSyncExternalStore } from 'react';
import { LOGIN_PATH, SIGNUP_PATHS, SIGNUP_TRANSITION_IDS } from '@/features/auth/constants/paths';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { easeOutIntegrator } from '@/shared/components/layout/easeOutIntegrator.internal';

export const ONBOARDING_TRANSITION_DURATION_MS = 300;
export const SIGNUP_DISSOLVE_DURATION_MS = 300;

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerReducedMotion = () => true;

const tuneTransition =
  (durationMs: number) =>
  ({ animation }: { animation: MultiAnimation<'out' | 'in'> }) => {
    animation.set({ integrator: easeOutIntegrator(durationMs) });
    // 중단된 이전 전환에서 돌아오는 DOM도 다시 조작할 수 있게 처리
    const incoming = animation.select('in').getMotionTracks()[0];
    if (incoming) incoming.element.inert = false;
    const outgoing = animation.select('out').getMotionTracks()[0];
    if (outgoing) {
      const element = outgoing.element;
      const wasInert = element.inert;
      const dispose = outgoing.onDispose;
      element.inert = true;
      outgoing.onDispose = (context) => {
        dispose?.(context);
        if (context.owns(element)) element.inert = wasInert;
      };
    }
  };
const tuneSlide = tuneTransition(ONBOARDING_TRANSITION_DURATION_MS);
const transition = slide({}, { override: { forward: tuneSlide, backward: tuneSlide } });
// 기획: 가입 화면의 헤더 뒤로 가기는 Dissolve / Ease out / 300ms. fade는 나가는 화면이 사라진 뒤 들어오는 화면이 나타나는 순차 방식이라
// 단계마다 절반씩 써서 전체 300ms 유지. 규칙은 두 방향에 모두 적용
const tuneDissolve = tuneTransition(SIGNUP_DISSOLVE_DURATION_MS / 2);
const dissolve = fade({}, { override: { forward: tuneDissolve, backward: tuneDissolve } });
const rules: SsgoiTransitionRule[] = [
  { from: SIGNUP_PATHS.terms, to: LOGIN_PATH, transition: dissolve },
  {
    from: SIGNUP_PATHS.profile,
    to: SIGNUP_PATHS.terms,
    transition: dissolve,
  },
  {
    from: SIGNUP_TRANSITION_IDS.termsDocument,
    to: SIGNUP_PATHS.terms,
    transition: dissolve,
  },
  { from: ONBOARDING_PATHS.start, to: ONBOARDING_PATHS.createBunch, transition },
  { from: ONBOARDING_PATHS.start, to: ONBOARDING_PATHS.joinBunch, transition },
  {
    from: ONBOARDING_PATHS.createBunchComplete,
    to: ONBOARDING_PATHS.createBunchInvite,
    transition,
  },
];

export function AppTransitions({ children }: { children: ReactNode }) {
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    getServerReducedMotion,
  );
  const config = useMemo<SsgoiConfig>(
    () => ({ transitions: reducedMotion ? [] : rules }),
    [reducedMotion],
  );
  return (
    <Ssgoi config={config}>
      <div className="bg-surface-primary relative isolate flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </Ssgoi>
  );
}
