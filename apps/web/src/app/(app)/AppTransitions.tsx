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
  drill,
  fade,
  MultiAnimation as CompositeAnimation,
  sheet,
  slide,
  type TransitionDirection,
  WebAnimation,
} from '@ssgoi/react/view-transitions';
import { type ReactNode, useMemo } from 'react';
import { LOGIN_PATH, SIGNUP_PATHS, SIGNUP_TRANSITION_IDS } from '@/features/auth/constants/paths';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';
import { BUNDLE_SELECT_PATHS } from '@/features/bundle/constants/selectPaths';
import { MAIN_TAB_PATHS } from '@/features/main-navigation/constants/tabs';
import { MY_PATHS } from '@/features/my/constants/paths';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { easeOutIntegrator } from '@/shared/components/layout/easeOutIntegrator.internal';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

export const ONBOARDING_TRANSITION_DURATION_MS = 300;
export const SIGNUP_DISSOLVE_DURATION_MS = 300;
// 기획: 추천 번들 상세 진입은 Slide In(왼쪽 방향)·나갈 때 Slide Out(오른쪽 방향), Ease In, 200ms
export const BUNDLE_DETAIL_SLIDE_DURATION_MS = 200;
export const BUNCH_ADD_DISSOLVE_DURATION_MS = 150;
// 더보기 메뉴 → 하위 화면은 한 단계 들어가는 이동이라 미는 slide 300ms(화면설계서에 정의 없음, 2026-11-01 디자이너 요청)
export const BUNCH_MENU_SUB_SLIDE_DURATION_MS = 300;
// 더보기 메뉴·알림 목록 진입 drill 시간. 화면설계서 Move in / ← / Ease out / 150ms가 빨라 보여 200ms(2026-11-02), 다시 250ms(2026-11-06 사용자 결정)
export const BUNCH_DRILL_DURATION_MS = 250;
export const TAB_CROSSFADE_DURATION_MS = 80;

// 나가는 화면은 포커스·보조기술에서 제외(inert)하고 data-page-leaving 표식(AppFrame이 그 화면의 배경 표식을 무시해 상태 바 영역도 함께 전환)
// 중단된 이전 전환에서 돌아오는 DOM은 다시 조작 가능하게 처리
const guardPair = (
  incoming: HTMLElement | undefined,
  outgoing: HTMLElement | undefined,
  track: WebAnimation | undefined,
) => {
  if (incoming) {
    incoming.inert = false;
    delete incoming.dataset.pageLeaving;
    delete incoming.dataset.sheetMoving;
  }
  if (!outgoing || !track) return;
  const wasInert = outgoing.inert;
  const dispose = track.onDispose;
  outgoing.inert = true;
  outgoing.dataset.pageLeaving = '';
  track.onDispose = (context) => {
    dispose?.(context);
    if (!context.owns(outgoing)) return;
    outgoing.inert = wasInert;
    delete outgoing.dataset.pageLeaving;
  };
};
const guardOutgoing = (animation: MultiAnimation<'out' | 'in'>) => {
  const outgoing = animation.select('out').getMotionTracks()[0];
  guardPair(animation.select('in').getMotionTracks()[0]?.element, outgoing?.element, outgoing);
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
// 번치 탭 ↔ 더보기 메뉴·알림 목록(앞으로 들어가는 이동): SSGOI drill(parallax) 프리셋
// 들어오는 화면은 오른쪽에서, 뒤 화면은 왼쪽으로 20% 함께 밀림. 시간·곡선만 Ease out / 250ms로 맞춤
const tuneBunchDrill = tuneTransition(BUNCH_DRILL_DURATION_MS);
const bunchDrill = drill(
  {},
  {
    override: { forward: tuneBunchDrill, backward: tuneBunchDrill },
  },
);
// sheet 프리셋은 움직이는 화면(sheet)만 track이라 뒤 화면은 경계 id로 찾아 나가는 화면 표식(상태 바 색 즉시 전환)
// 중단된 이전 전환의 노드가 남아 있을 수 있어 같은 id 중 가장 나중에 붙은 노드 사용
const guardSheet =
  (opening: boolean, behindId: string) =>
  ({
    animation,
    context,
  }: {
    animation: MultiAnimation<'overlay' | 'sheet' | 'background'>;
    context: { positionedParent: HTMLElement };
  }) => {
    const track = animation.select('sheet').getMotionTracks()[0];
    if (!track) return;
    const sheetElement = track.element;
    const behind = [
      ...context.positionedParent.querySelectorAll<HTMLElement>(
        `[data-ssgoi-transition="${behindId}"]`,
      ),
    ].at(-1);
    if (opening) guardPair(sheetElement, behind, track);
    else guardPair(behind, sheetElement, track);
    // 움직이는 동안 AppFrame이 상태 바 영역 색을 시트 도착에 맞춰 천천히 바꾸도록 표식
    sheetElement.dataset.sheetMoving = '';
    const dispose = track.onDispose;
    track.onDispose = (disposal) => {
      dispose?.(disposal);
      if (disposal.owns(sheetElement)) delete sheetElement.dataset.sheetMoving;
    };
  };
const bunchSheet = sheet(
  {},
  {
    override: {
      forward: guardSheet(true, BUNCH_HOME_PATHS.home),
      backward: guardSheet(false, BUNCH_HOME_PATHS.home),
    },
  },
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
  // 번치 홈 플로팅 버튼 → 번들 만들기(멤버 선택)는 모달처럼 아래에서 올라오고 닫으면 내려가는 sheet 프리셋(SSGOI 데모의 Home → Create)
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNDLE_SELECT_PATHS.members,
    bidirectional: true,
    transition: bunchSheet,
  },
  // 멤버 선택 → 사진 선택은 옆으로 넘어가는 슬라이드
  {
    from: BUNDLE_SELECT_PATHS.members,
    to: BUNDLE_SELECT_PATHS.select,
    bidirectional: true,
    transition: bundleSlide,
  },
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.menu,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 메인 관리자가 지정 화면에서 번치 탭으로 두 칸 되돌아갈 때도 메뉴처럼 drill(정방향 진입은 없음)
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.leave,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 다른 번치 프로필(피드 카드의 번치에서 들어감)과 그 멤버 목록도 한 단계 들어가는 drill
  {
    from: MAIN_TAB_PATHS.feed,
    to: BUNCH_HOME_PATHS.transitionIds.otherBunch,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 피드 헤더 알림도 번치 홈 알림과 같은 drill
  {
    from: MAIN_TAB_PATHS.feed,
    to: BUNCH_HOME_PATHS.notifications,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: BUNCH_HOME_PATHS.transitionIds.otherBunch,
    to: BUNCH_HOME_PATHS.notifications,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: BUNCH_HOME_PATHS.transitionIds.otherBunch,
    to: BUNCH_HOME_PATHS.transitionIds.otherBunchMembers,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 프로필의 팔로워·팔로잉 수 → 목록, 목록의 「팔로우 요청」 → 요청 목록도 한 단계 들어가는 drill
  {
    from: BUNCH_HOME_PATHS.transitionIds.otherBunch,
    to: BUNCH_HOME_PATHS.transitionIds.otherBunchFollows,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.follows,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 콕한 장소도 번치 홈에서 한 단계 들어가는 drill
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.places,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: BUNCH_HOME_PATHS.follows,
    to: BUNCH_HOME_PATHS.followRequests,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 알림 아이콘 → 알림 목록도 메뉴와 같은 drill(화면설계서 2236:41816 3번 Move in ←과 방향 같음)
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.notifications,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 번치를 삭제하면 확인 화면에서 번치 탭으로 세 칸 되돌아감(정방향 진입은 없음)
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.deleteConfirm,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.profile,
    bidirectional: true,
    transition: menuSubSlide,
  },
  // MY 프로필 행 → 개인 프로필 수정도 번치 프로필 편집과 같은 미는 slide(화면설계서에 전환 정의 없음, 2026-11-05 사용자 결정)
  {
    from: MY_PATHS.home,
    to: MY_PATHS.profile,
    bidirectional: true,
    transition: menuSubSlide,
  },
  // MY 알림 설정도 같은 미는 slide(화면설계서에 전환 정의 없음, 프로필 수정과 맞춤)
  {
    from: MY_PATHS.home,
    to: MY_PATHS.notifications,
    bidirectional: true,
    transition: menuSubSlide,
  },
  // MY 회원 탈퇴도 같은 미는 slide(화면설계서에 전환 정의 없음)
  {
    from: MY_PATHS.home,
    to: MY_PATHS.withdrawal,
    bidirectional: true,
    transition: menuSubSlide,
  },
  // 탈퇴 안내 → 관리자 권한 이전도 같은 미는 slide(화면설계서에 전환 정의 없음)
  {
    from: MY_PATHS.withdrawal,
    to: MY_PATHS.withdrawalTransfer,
    bidirectional: true,
    transition: menuSubSlide,
  },
  // MY 약관 두 화면도 같은 미는 slide(화면설계서에 전환 정의 없음). 동적 route라 고정 id 사용
  {
    from: MY_PATHS.home,
    to: MY_PATHS.transitionIds.terms,
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
  // 작성 화면 → 대표 사진 투표(「픽하기 >」)도 참여 멤버 관리와 같은 슬라이드
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.pick,
    bidirectional: true,
    transition,
  },
  // 작성 화면 → 공개 범위(업로드 직전)도 같은 슬라이드
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.visibility,
    bidirectional: true,
    transition,
  },
  // 작성 화면 → 사진 상세(크게 보기)도 같은 슬라이드
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.viewer,
    bidirectional: true,
    transition,
  },
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.photo,
    bidirectional: true,
    transition,
  },
  {
    from: BUNDLE_PATHS.transitionIds.photo,
    to: BUNDLE_PATHS.transitionIds.photoAdd,
    bidirectional: true,
    transition: bundleSlide,
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
  const reducedMotion = useReducedMotion();
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
