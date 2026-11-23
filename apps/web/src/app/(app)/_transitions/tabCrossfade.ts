import { type Integrator } from '@ssgoi/react';
import {
  defineTransition,
  MultiAnimation as CompositeAnimation,
  type TransitionDirection,
  WebAnimation,
} from '@ssgoi/react/view-transitions';
import { guardOutgoing } from './pageGuards';

const TAB_CROSSFADE_DURATION_MS = 80;

// 결정 기록 017: 하단 탭 사이 80ms 등속 크로스페이드. 들어오는 탭은 아래에 불투명하게 두고 위로 올린 나가는 탭만 페이드
// 두 탭을 함께 페이드하면 같은 자리의 같은 헤더가 중간에 흐려지므로 위 화면만 투명도를 바꿈(SSGOI가 나가는 화면을 absolute로 겹침)
// SSGOI 7.4.1의 LinearIntegrator는 남은 거리에 비례해 움직여(지수 감속) 등속이 아니라 직접 등속으로 진행
export const tabCrossfadeIntegrator = (): Integrator => ({
  step: (state, target, dt) => {
    const delta = (dt * 1000) / TAB_CROSSFADE_DURATION_MS;
    const position =
      target > state.position
        ? Math.min(target, state.position + delta)
        : Math.max(target, state.position - delta);
    return { position, velocity: 0 };
  },
  isSettled: (state, target) => Math.abs(state.position - target) < 0.000001,
});
export const tabCrossfadeDirection: TransitionDirection<
  object,
  CompositeAnimation<'out' | 'in'>
> = {
  prepare: ({ from, to }) => {
    void from.then((element) => {
      element.style.zIndex = '2';
      element.style.pointerEvents = 'none';
    });
    void to.then((element) => {
      // 연속 탭으로 나가던 화면이 다시 들어오면 이전 전환의 설정 해제
      element.style.opacity = '';
      element.style.pointerEvents = '';
      element.style.position = 'relative';
      element.style.zIndex = '1';
    });
    return {};
  },
  animation: ({ from, to }) =>
    new CompositeAnimation({
      out: new WebAnimation({
        element: from,
        integrator: tabCrossfadeIntegrator(),
        style: (progress) => ({ opacity: `${1 - progress}` }),
        // 연속 탭으로 다음 전환이 같은 화면을 이어받았으면 그쪽 설정 유지
        onDispose: (context) => {
          if (!context.owns(from)) return;
          from.style.opacity = '';
          from.style.zIndex = '';
          from.style.pointerEvents = '';
        },
      }),
      in: new WebAnimation({
        element: to,
        integrator: tabCrossfadeIntegrator(),
        style: () => ({}),
        onDispose: (context) => {
          if (!context.owns(to)) return;
          if (to.style.position === 'relative') to.style.position = '';
          to.style.zIndex = '';
        },
      }),
    }),
};
// 시간·곡선은 다른 전환처럼 override로 지정(등속 80ms)
const tuneTabCrossfade = ({ animation }: { animation: CompositeAnimation<'out' | 'in'> }) => {
  animation.set({ integrator: tabCrossfadeIntegrator() });
  guardOutgoing(animation);
};
export const tabCrossfade = defineTransition(
  { forward: tabCrossfadeDirection, backward: tabCrossfadeDirection },
  { override: { forward: tuneTabCrossfade, backward: tuneTabCrossfade } },
);
