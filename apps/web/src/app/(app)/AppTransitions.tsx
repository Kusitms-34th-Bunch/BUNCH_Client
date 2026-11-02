'use client';

import {
  type Integrator,
  Ssgoi,
  type SsgoiConfig,
  type SsgoiTransitionRule,
  type MultiAnimation,
} from '@ssgoi/react';
import {
  defineTransition,
  fade,
  MultiAnimation as CompositeAnimation,
  slide,
  type TransitionDirection,
  WebAnimation,
} from '@ssgoi/react/view-transitions';
import { type ReactNode, useMemo, useSyncExternalStore } from 'react';
import { LOGIN_PATH, SIGNUP_PATHS, SIGNUP_TRANSITION_IDS } from '@/features/auth/constants/paths';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';
import { BUNDLE_SELECT_PATHS } from '@/features/bundle/constants/selectPaths';
import { MAIN_TAB_PATHS } from '@/features/main-navigation/constants/tabs';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { easeOutIntegrator } from '@/shared/components/layout/easeOutIntegrator.internal';

export const ONBOARDING_TRANSITION_DURATION_MS = 300;
export const SIGNUP_DISSOLVE_DURATION_MS = 300;
// 기획: 추천 번들 상세 진입은 Slide In(왼쪽 방향)·나갈 때 Slide Out(오른쪽 방향), Ease In, 200ms
export const BUNDLE_DETAIL_SLIDE_DURATION_MS = 200;
export const BUNCH_ADD_DISSOLVE_DURATION_MS = 150;
// 화면설계서(번치 상세): 더보기 메뉴 진입 Move in / ← / Ease out / 150ms, 뒤로 가기 Move out / → / 같은 시간
export const BUNCH_MENU_MOVE_DURATION_MS = 150;
// 더보기 메뉴 → 하위 화면은 한 단계 들어가는 이동이라 미는 slide 300ms(화면설계서에 정의 없음, 2026-11-01 디자이너 요청)
export const BUNCH_MENU_SUB_SLIDE_DURATION_MS = 300;
export const TAB_CROSSFADE_DURATION_MS = 80;

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerReducedMotion = () => true;

// 나가는 화면은 포커스·보조기술에서 제외(inert)하고 data-page-leaving 표식(AppFrame이 그 화면의 배경 표식을 무시해 상태 바 영역도 함께 전환)
// 중단된 이전 전환에서 돌아오는 DOM은 다시 조작 가능하게 처리
const guardOutgoing = (animation: MultiAnimation<'out' | 'in'>) => {
  const incoming = animation.select('in').getMotionTracks()[0];
  if (incoming) {
    incoming.element.inert = false;
    delete incoming.element.dataset.pageLeaving;
  }
  const outgoing = animation.select('out').getMotionTracks()[0];
  if (outgoing) {
    const element = outgoing.element;
    const wasInert = element.inert;
    const dispose = outgoing.onDispose;
    element.inert = true;
    element.dataset.pageLeaving = '';
    outgoing.onDispose = (context) => {
      dispose?.(context);
      if (!context.owns(element)) return;
      element.inert = wasInert;
      delete element.dataset.pageLeaving;
    };
  }
};
const tuneTransition =
  (durationMs: number) =>
  ({ animation }: { animation: MultiAnimation<'out' | 'in'> }) => {
    animation.set({ integrator: easeOutIntegrator(durationMs) });
    guardOutgoing(animation);
  };
const tuneSlide = tuneTransition(ONBOARDING_TRANSITION_DURATION_MS);
const transition = slide({}, { override: { forward: tuneSlide, backward: tuneSlide } });
// 기획: 가입 화면의 헤더 뒤로 가기는 Dissolve / Ease out / 300ms. fade는 나가는 화면이 사라진 뒤 들어오는 화면이 나타나는 순차 방식이라
// 단계마다 절반씩 써서 전체 300ms 유지. 규칙은 두 방향에 모두 적용
const tuneDissolve = tuneTransition(SIGNUP_DISSOLVE_DURATION_MS / 2);
const dissolve = fade({}, { override: { forward: tuneDissolve, backward: tuneDissolve } });
const tuneBundleSlide = tuneTransition(BUNDLE_DETAIL_SLIDE_DURATION_MS);
const tuneMenuSubSlide = tuneTransition(BUNCH_MENU_SUB_SLIDE_DURATION_MS);
const menuSubSlide = slide(
  {},
  { override: { forward: tuneMenuSubSlide, backward: tuneMenuSubSlide } },
);
const bundleSlide = slide(
  {},
  { override: { forward: tuneBundleSlide, backward: tuneBundleSlide } },
);
// 화면설계서(번치 메인 8): 「새로운 번치 추가하기」 → 번치 시작 선택은 Dissolve / Ease out / 150ms, 같은 방식으로 단계마다 절반
const tuneBunchAddDissolve = tuneTransition(BUNCH_ADD_DISSOLVE_DURATION_MS / 2);
const bunchAddDissolve = fade(
  {},
  { override: { forward: tuneBunchAddDissolve, backward: tuneBunchAddDissolve } },
);
// 더보기 메뉴는 번치 홈 위를 덮으며 들어오고(Move in), 돌아갈 때 위에서 빠짐(Move out). 아래 화면은 움직이지 않음
// 움직이는 화면을 위로 올리고 transform만 바꿈(SSGOI가 나가는 화면을 absolute로 겹침)
const moveDirection = (
  moving: 'in' | 'out',
): TransitionDirection<object, CompositeAnimation<'out' | 'in'>> => ({
  prepare: ({ from, to }) => {
    void from.then((element) => {
      element.style.zIndex = moving === 'out' ? '2' : '1';
      element.style.pointerEvents = 'none';
    });
    void to.then((element) => {
      // 진입 도중 뒤로 가서 나가던 화면이 다시 들어오면 이전 전환의 설정 해제
      element.style.pointerEvents = '';
      element.style.transform = moving === 'in' ? 'translateX(100%)' : '';
      element.style.position = 'relative';
      element.style.zIndex = moving === 'in' ? '2' : '1';
    });
    return {};
  },
  animation: ({ from, to }) =>
    new CompositeAnimation({
      out: new WebAnimation({
        element: from,
        integrator: easeOutIntegrator(BUNCH_MENU_MOVE_DURATION_MS),
        style: (progress) =>
          moving === 'out' ? { transform: `translateX(${progress * 100}%)` } : {},
        onDispose: (context) => {
          if (!context.owns(from)) return;
          from.style.transform = '';
          from.style.zIndex = '';
          from.style.pointerEvents = '';
        },
      }),
      in: new WebAnimation({
        element: to,
        integrator: easeOutIntegrator(BUNCH_MENU_MOVE_DURATION_MS),
        style: (progress) =>
          moving === 'in' ? { transform: `translateX(${(1 - progress) * 100}%)` } : {},
        onDispose: (context) => {
          if (!context.owns(to)) return;
          to.style.transform = '';
          if (to.style.position === 'relative') to.style.position = '';
          to.style.zIndex = '';
        },
      }),
    }),
});
const tuneBunchMenuMove = tuneTransition(BUNCH_MENU_MOVE_DURATION_MS);
const bunchMenuMove = defineTransition(
  { forward: moveDirection('in'), backward: moveDirection('out') },
  { override: { forward: tuneBunchMenuMove, backward: tuneBunchMenuMove } },
);
// 결정 기록 017: 하단 탭 사이 80ms 등속 크로스페이드. 들어오는 탭은 아래에 불투명하게 두고 위로 올린 나가는 탭만 페이드
// 두 탭을 함께 페이드하면 같은 자리의 같은 헤더가 중간에 흐려지므로 위 화면만 투명도를 바꿈(SSGOI가 나가는 화면을 absolute로 겹침)
// SSGOI 7.4.1의 LinearIntegrator는 남은 거리에 비례해 움직여(지수 감속) 등속이 아니라 직접 등속으로 진행
const tabCrossfadeIntegrator = (): Integrator => ({
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
const tabCrossfadeDirection: TransitionDirection<object, CompositeAnimation<'out' | 'in'>> = {
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
const tabCrossfade = defineTransition(
  { forward: tabCrossfadeDirection, backward: tabCrossfadeDirection },
  { override: { forward: tuneTabCrossfade, backward: tuneTabCrossfade } },
);
const tabPaths = Object.values(MAIN_TAB_PATHS);
const tabRules: SsgoiTransitionRule[] = tabPaths.flatMap((from) =>
  tabPaths.filter((to) => to !== from).map((to) => ({ from, to, transition: tabCrossfade })),
);
const rules: SsgoiTransitionRule[] = [
  ...tabRules,
  { from: BUNCH_HOME_PATHS.home, to: ONBOARDING_PATHS.start, transition: bunchAddDissolve },
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.menu,
    bidirectional: true,
    transition: bunchMenuMove,
  },
  // 메인 관리자가 지정 화면에서 번치 탭으로 두 칸 되돌아갈 때도 메뉴처럼 Move out(정방향 진입은 없음)
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.leave,
    bidirectional: true,
    transition: bunchMenuMove,
  },
  // 화면설계서(2236:41816 3번): 알림 아이콘 → 알림 목록 Move in / ← / Ease out / 150ms, 뒤로 가기 Move out
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.notifications,
    bidirectional: true,
    transition: bunchMenuMove,
  },
  // 번치를 삭제하면 확인 화면에서 번치 탭으로 세 칸 되돌아감(정방향 진입은 없음)
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.deleteConfirm,
    bidirectional: true,
    transition: bunchMenuMove,
  },
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.profile,
    bidirectional: true,
    transition: menuSubSlide,
  },
  // 멤버 관리와 권한 안내도 메뉴 하위 화면과 같은 미는 slide(화면설계서에 전환 정의 없음)
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.members,
    bidirectional: true,
    transition: menuSubSlide,
  },
  {
    from: BUNCH_HOME_PATHS.members,
    to: BUNCH_HOME_PATHS.roles,
    bidirectional: true,
    transition: menuSubSlide,
  },
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.leave,
    bidirectional: true,
    transition: menuSubSlide,
  },
  // 번치 삭제 안내 → 확인 문구 입력도 한 단계씩 들어가는 slide
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.delete,
    bidirectional: true,
    transition: menuSubSlide,
  },
  {
    from: BUNCH_HOME_PATHS.delete,
    to: BUNCH_HOME_PATHS.deleteConfirm,
    bidirectional: true,
    transition: menuSubSlide,
  },
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.blocked,
    bidirectional: true,
    transition: menuSubSlide,
  },
  // 멤버 초대는 멤버 관리 헤더와 더보기 메뉴 두 곳에서 들어옴
  {
    from: BUNCH_HOME_PATHS.members,
    to: BUNCH_HOME_PATHS.invite,
    bidirectional: true,
    transition: menuSubSlide,
  },
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.invite,
    bidirectional: true,
    transition: menuSubSlide,
  },
  {
    from: BUNDLE_SELECT_PATHS.select,
    to: BUNDLE_SELECT_PATHS.transitionIds.recommendation,
    bidirectional: true,
    transition: bundleSlide,
  },
  // 번들 작성 화면 ↔ 참여 멤버 관리·사진 캡션 화면은 온보딩과 같은 슬라이드(300ms). 뒤로 가기는 방향이 반대
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.members,
    bidirectional: true,
    transition,
  },
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.photo,
    bidirectional: true,
    transition,
  },
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
