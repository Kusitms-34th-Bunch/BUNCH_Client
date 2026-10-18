'use client';

import {
  Ssgoi,
  type SsgoiConfig,
  type SsgoiTransitionRule,
  type MultiAnimation,
} from '@ssgoi/react';
import { slide } from '@ssgoi/react/view-transitions';
import { type ReactNode, useMemo, useSyncExternalStore } from 'react';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { easeOutIntegrator } from '@/shared/components/layout/easeOutIntegrator.internal';

export const ONBOARDING_TRANSITION_DURATION_MS = 200;

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerReducedMotion = () => true;

const tuneSlide = ({ animation }: { animation: MultiAnimation<'out' | 'in'> }) => {
  animation.set({ integrator: easeOutIntegrator(ONBOARDING_TRANSITION_DURATION_MS) });
  // 중단된 이전 전환에서 돌아오는 DOM도 다시 조작할 수 있게 한다.
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
const transition = slide({}, { override: { forward: tuneSlide, backward: tuneSlide } });
const rules: SsgoiTransitionRule[] = [
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
