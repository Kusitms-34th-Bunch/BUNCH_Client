'use client';

import {
  type Integrator,
  Ssgoi,
  type SsgoiConfig,
  type SsgoiTransitionRule,
  type MultiAnimation,
} from '@ssgoi/react';
import {
  axis,
  defineTransition,
  drill,
  fade,
  hero,
  MultiAnimation as CompositeAnimation,
  sheet,
  slide,
  type TransitionDirection,
  WebAnimation,
  zoom,
} from '@ssgoi/react/view-transitions';
import { type ReactNode, useMemo } from 'react';
import {
  INTRO_PATH,
  LOGIN_PATH,
  SIGNUP_PATHS,
  SIGNUP_TRANSITION_IDS,
} from '@/features/auth/constants/paths';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { BUNDLE_PATHS } from '@/features/bundle/constants/paths';
import { BUNDLE_SELECT_PATHS } from '@/features/bundle/constants/selectPaths';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { MAIN_TAB_PATHS } from '@/features/main-navigation/constants/tabs';
import { MY_PATHS } from '@/features/my/constants/paths';
import { ONBOARDING_PATHS } from '@/features/onboarding/constants/paths';
import { PHOTO_BOX_PATHS } from '@/features/photo-box/constants/paths';
import {
  cubicBezierIntegrator,
  easeOutIntegrator,
} from '@/shared/components/layout/easeOutIntegrator.internal';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

export const ONBOARDING_TRANSITION_DURATION_MS = 300;
export const SIGNUP_DISSOLVE_DURATION_MS = 300;
// 기획: 추천 번들 상세 진입은 Slide In(왼쪽 방향)·나갈 때 Slide Out(오른쪽 방향), Ease In, 200ms
export const BUNDLE_DETAIL_SLIDE_DURATION_MS = 200;
// 번치 전환 시트 「새로운 번치 추가하기」 → 번치 시작 선택: 화면설계서는 Dissolve 150ms지만 폰에서 바로 바뀐 것처럼 보여 axis y로(2026-11-20 사용자 결정)
export const BUNCH_ADD_AXIS_DURATION_MS = 300;
// 인트로 → 로그인 교차 디졸브 시간(디자이너 요청, 화면설계서 값 없음). 흰 가이드에서 어두운 영상 화면으로 바뀌어 가입 화면(300ms)보다 천천히
export const INTRO_LOGIN_DISSOLVE_DURATION_MS = 500;
// 더보기 메뉴 → 하위 화면은 한 단계 들어가는 이동이라 미는 slide 300ms(화면설계서에 정의 없음, 2026-11-01 디자이너 요청)
export const BUNCH_MENU_SUB_SLIDE_DURATION_MS = 300;
// 더보기 메뉴·알림 목록 진입 drill 시간. 화면설계서 Move in / ← / Ease out / 150ms가 빨라 보여 200ms(2026-11-02), 다시 250ms(2026-11-06 사용자 결정)
export const BUNCH_DRILL_DURATION_MS = 250;
export const TAB_CROSSFADE_DURATION_MS = 80;
// 가입 완료 → 번치 시작, 초대 참여 완료 → 피드: 한 흐름을 마치고 다음 장면으로 넘어가는 이동(화면설계서에 정의 없음, 2026-11-20 사용자 결정)
export const SCENE_CHANGE_DURATION_MS = 300;

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
// 순서형(나간 뒤 들어옴)이면 사이에 흰 바탕이 보여(QA L3, 약 0.45초) 두 화면을 동시에 교차(startAt은 재생 때 읽음)
const tuneIntroDissolve = ({ animation }: { animation: MultiAnimation<'out' | 'in'> }) => {
  animation.startAt = [0, 0];
  animation.set({ integrator: easeOutIntegrator(INTRO_LOGIN_DISSOLVE_DURATION_MS) });
  guardOutgoing(animation);
};
const introDissolve = fade(
  {},
  { override: { forward: tuneIntroDissolve, backward: tuneIntroDissolve } },
);
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
// SSGOI axis y(방향형): 열 때 새 화면이 아래에서 올라오고, 닫기(뒤로 가기)는 위에서 내려감. 시트에서 이어져 새 흐름을 여는 이동
const tuneBunchAdd = tuneTransition(BUNCH_ADD_AXIS_DURATION_MS);
const bunchAddAxis = axis(
  { type: 'y' },
  { override: { forward: tuneBunchAdd, backward: tuneBunchAdd } },
);
// SSGOI axis z(Material 공유 축 Z): 이전 화면은 110%로 커지며 사라지고 새 화면은 90%에서 커지며 나타남. 방향이 없어 뒤로 가기로 오해하지 않음
const tuneSceneChange = tuneTransition(SCENE_CHANGE_DURATION_MS);
const sceneChange = axis(
  { type: 'z' },
  { override: { forward: tuneSceneChange, backward: tuneSceneChange } },
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
// 두 화면이 서로 앞으로 들어가는 사이(알림 ↔ 번치 탭·번들 상세, 다른 번치 ↔ 팔로우 목록 등)의 drill
// from·to가 같은 두 경로라 양방향 점수가 같아 SSGOI가 기록 방향(push는 앞, 뒤로 가기는 뒤)을 씀
const historyDrill = (a: string, b: string): SsgoiTransitionRule => ({
  from: [a, b],
  to: [a, b],
  transition: bunchDrill,
});
// 피드 카드 → 번들 상세(Figma `6892:46500` 「게시글 확대 모션」): 카드(사진과 딤·글자)가 상세의 첫 사진 자리로 옮겨 가며 상세 화면이 겹쳐 나타남
// 카드 `data-hero-enter-key`·상세 첫 사진 `data-hero-exit-key`(BundlePhoto `heroKey`) 조합의 이유와 시간·곡선은 docs/architecture/motion.md
const FEED_BUNDLE_HERO_MS = 550;
// 다른 전환과 같이 나가는 화면은 전환 동안 inert·나가는 화면 표식(초점·상태 바 배경)
const guardHero = ({ animation }: { animation: MultiAnimation<'shared' | 'out' | 'in'> }) => {
  const outgoing = animation.select('out').getMotionTracks()[0];
  guardPair(animation.select('in').getMotionTracks()[0]?.element, outgoing?.element, outgoing);
};
const tuneFeedBundleHero = ({
  animation,
}: {
  animation: MultiAnimation<'shared' | 'out' | 'in'>;
}) => {
  animation.set({ integrator: cubicBezierIntegrator(FEED_BUNDLE_HERO_MS, [0.3, 0, 0.15, 1]) });
  guardHero({ animation });
};
const feedBundleHero = hero(
  { type: 'fade' },
  { override: { forward: tuneFeedBundleHero, backward: tuneFeedBundleHero } },
);
// 사진함 썸네일 → 사진 상세 hero(Figma에 정의 없음). 들어갈 때는 spring이 처음에 급해 확대보다 바뀌는 느낌이라 피드와 같은 곡선
// 돌아갈 때는 부드러운 spring(smooth) 그대로(사용자 확인)
const photoHero = hero(
  { type: 'fade', variant: 'smooth' },
  { override: { forward: tuneFeedBundleHero, backward: guardHero } },
);
// 피드 말풍선 → 번들 상세(댓글): 눌린 카드가 상세 화면 전체로 열리는 zoom static(뒤 피드는 그대로, 뒤로 가면 카드로 접힘)
// 상세를 이미 댓글 위치로 내려 두고 열어 사진이 이어지는 hero 대신 씀(motion.md). 나가는 화면은 경계 id로 찾아 다른 전환과 같은 표식
type ZoomGroup = 'overlay' | 'content' | 'chrome' | 'background' | 'tile';
const guardZoom =
  (opening: boolean) =>
  ({
    animation,
    context,
  }: {
    animation: MultiAnimation<ZoomGroup>;
    context: { positionedParent: HTMLElement };
  }) => {
    const groups: ZoomGroup[] = ['tile', 'content', 'overlay', 'chrome', 'background'];
    const track = groups.map((group) => animation.select(group).getMotionTracks()[0]).find(Boolean);
    const last = (id: string) =>
      [
        ...context.positionedParent.querySelectorAll<HTMLElement>(
          `[data-ssgoi-transition="${id}"]`,
        ),
      ].at(-1);
    const feed = last(MAIN_TAB_PATHS.feed);
    const detail = last(FEED_PATHS.transitionIds.bundleComments);
    if (opening) guardPair(detail, feed, track);
    else guardPair(feed, detail, track);
  };
const feedCommentsZoom = zoom(
  { type: 'static' },
  { override: { forward: guardZoom(true), backward: guardZoom(false) } },
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
    // 중단된 이전 전환이 남긴 표식·띠를 지우고 이번 전환을 이 요소의 주인으로 둠
    clearSheetMarks(sheetElement);
    const guard: SheetGuard = {};
    sheetGuards.set(sheetElement, guard);
    const behind = [
      ...context.positionedParent.querySelectorAll<HTMLElement>(
        `[data-ssgoi-transition="${behindId}"]`,
      ),
    ].at(-1);
    if (opening) guardPair(sheetElement, behind, track);
    else guardPair(behind, sheetElement, track);
    // 움직이는 동안 AppFrame이 상태 바 영역 색을 시트 도착에 맞춰 천천히 바꾸도록 표식
    sheetElement.dataset.sheetMoving = '';
    // 올라오는 동안은 상태 바 영역을 뒤 화면 색으로 둠(뒤 화면은 떠나는 화면이라 AppFrame이 무시하므로 시트에 잠시 옮김)
    const keep = opening
      ? behind?.querySelector('[data-app-background]')?.getAttribute('data-app-background')
      : null;
    if (keep) sheetElement.dataset.appBackground = keep;
    // 시트 위 상태 바 높이의 흰 띠: 올라오며 상태 바를 덮고 내려가며 뒤 화면 색을 드러냄(색이 먼저 바뀌어 보이지 않게)
    sheetElement.style.boxShadow =
      '0 calc(-1 * var(--safe-area-top, 0px)) 0 var(--color-surface-primary)';
    const dispose = track.onDispose;
    track.onDispose = (disposal) => {
      dispose?.(disposal);
      // 이 요소를 새로 맡은 전환이 있으면 그 표식을 건드리지 않음. 중단됐으면 남긴 표식만 지움
      if (sheetGuards.get(sheetElement) !== guard) return;
      if (!disposal.owns(sheetElement)) {
        clearSheetMarks(sheetElement);
        return;
      }
      delete sheetElement.dataset.sheetMoving;
      if (keep) delete sheetElement.dataset.appBackground;
      // 띠는 AppFrame 색 전환(150ms)이 끝난 뒤에 걷음(도착 순간 덜 바뀐 색이 비치지 않게)
      // ponytail: 고정 지연, 전환 시간이 바뀌면 함께 맞춤
      guard.timer = setTimeout(
        () => sheetElement.style.removeProperty('box-shadow'),
        SHEET_BAND_HOLD_MS,
      );
    };
  };
// AppFrame 상태 바 색 전환(motion-safe duration-150)보다 조금 길게
const SHEET_BAND_HOLD_MS = 200;
type SheetGuard = { timer?: ReturnType<typeof setTimeout> };
// 요소마다 마지막으로 맡은 시트 전환(중단·재사용된 노드에서 이전 전환이 새 전환의 표식을 지우지 않게)
const sheetGuards = new WeakMap<HTMLElement, SheetGuard>();
// 시트 요소의 표식은 모두 guardSheet가 붙인 것이라 통째로 지움
const clearSheetMarks = (element: HTMLElement) => {
  clearTimeout(sheetGuards.get(element)?.timer);
  delete element.dataset.sheetMoving;
  delete element.dataset.appBackground;
  element.style.removeProperty('box-shadow');
};
const sheetOver = (behindId: string) =>
  sheet(
    {},
    {
      override: {
        forward: guardSheet(true, behindId),
        backward: guardSheet(false, behindId),
      },
    },
  );
const bunchSheet = sheetOver(BUNCH_HOME_PATHS.home);
const notificationSheet = sheetOver(BUNCH_HOME_PATHS.notifications);
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
  {
    from: BUNCH_HOME_PATHS.home,
    to: ONBOARDING_PATHS.start,
    bidirectional: true,
    transition: bunchAddAxis,
  },
  // 번치 홈 플로팅 버튼 → 번들 만들기(멤버 선택)는 모달처럼 아래에서 올라오고 닫으면 내려가는 sheet 프리셋(SSGOI 데모의 Home → Create)
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNDLE_SELECT_PATHS.members,
    bidirectional: true,
    transition: bunchSheet,
  },
  // 작성 중인 번들 → 번들 작성 화면도 만들기를 이어서 하는 흐름이라 같은 sheet(화면설계서에 정의 없음)
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNDLE_PATHS.transitionIds.draft,
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
  // 피드 말풍선 → 번들 상세(댓글)는 카드가 화면으로 열리는 zoom
  {
    from: MAIN_TAB_PATHS.feed,
    to: FEED_PATHS.transitionIds.bundleComments,
    bidirectional: true,
    transition: feedCommentsZoom,
  },
  // 피드 카드 → 번들 상세는 카드 사진을 상세 첫 사진으로 잇는 hero(Figma는 들어갈 때만 정의, 돌아올 때도 같은 곡선으로 되돌림)
  {
    from: MAIN_TAB_PATHS.feed,
    to: FEED_PATHS.transitionIds.bundle,
    bidirectional: true,
    transition: feedBundleHero,
  },
  // 사진함 썸네일 → 사진 상세도 같은 사진을 잇는 hero
  {
    from: MAIN_TAB_PATHS.photos,
    to: PHOTO_BOX_PATHS.transitionIds.detail,
    bidirectional: true,
    transition: photoHero,
  },
  // 번치 탭·다른 번치 프로필의 번들 격자 → 상세도 칸 사진을 상세 첫 사진으로 잇는 같은 hero(같은 사진이 이어짐, 화면설계서에 정의 없음)
  // 상세의 번치 → 번치 탭·다른 번치 프로필도 이 규칙의 돌아가는 방향(격자 칸이 있으면 그 자리로, 없으면 겹쳐 바뀜)
  {
    from: [BUNCH_HOME_PATHS.home, BUNCH_HOME_PATHS.transitionIds.otherBunch],
    to: FEED_PATHS.transitionIds.bundle,
    bidirectional: true,
    transition: feedBundleHero,
  },
  // 말풍선으로 연 상세에서 번치로 가는 이동도 같은 drill
  historyDrill(BUNCH_HOME_PATHS.home, FEED_PATHS.transitionIds.bundleComments),
  historyDrill(BUNCH_HOME_PATHS.transitionIds.otherBunch, FEED_PATHS.transitionIds.bundleComments),
  // 참여 멤버 시트 → 멤버 프로필 → 번치 프로필도 한 단계씩 들어가는 drill
  {
    from: MAIN_TAB_PATHS.feed,
    to: FEED_PATHS.transitionIds.member,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: [FEED_PATHS.transitionIds.bundle, FEED_PATHS.transitionIds.bundleComments],
    to: FEED_PATHS.transitionIds.member,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 번들 상세 → 공개 범위 설정도 한 단계 들어가는 drill
  {
    from: [FEED_PATHS.transitionIds.bundle, FEED_PATHS.transitionIds.bundleComments],
    to: FEED_PATHS.transitionIds.bundleVisibility,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 번들 상세 → 번들 수정, 수정 → 사진 추가도 한 단계 들어가는 drill
  {
    from: [FEED_PATHS.transitionIds.bundle, FEED_PATHS.transitionIds.bundleComments],
    to: FEED_PATHS.transitionIds.bundleEdit,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: FEED_PATHS.transitionIds.bundleEdit,
    to: FEED_PATHS.transitionIds.bundleEditPhotoAdd,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: FEED_PATHS.transitionIds.bundleEdit,
    to: FEED_PATHS.transitionIds.bundleEditPhotoViewer,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: FEED_PATHS.transitionIds.member,
    to: BUNCH_HOME_PATHS.home,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: FEED_PATHS.transitionIds.member,
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
    to: BUNCH_HOME_PATHS.transitionIds.otherBunchMembers,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 프로필의 팔로워·팔로잉 수 → 목록, 목록의 「팔로우 요청」 → 요청 목록도 한 단계 들어가는 drill
  // 목록의 행 → 또 다른 번치 프로필도 앞으로 들어가는 이동이라 기록 방향
  historyDrill(
    BUNCH_HOME_PATHS.transitionIds.otherBunch,
    BUNCH_HOME_PATHS.transitionIds.otherBunchFollows,
  ),
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.follows,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 프로필의 멤버 수 → 멤버 목록(5.1.4), 팔로워·팔로잉 행 → 그 번치 프로필(5.11.1)도 한 단계 들어가는 drill
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.members,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: BUNCH_HOME_PATHS.follows,
    to: BUNCH_HOME_PATHS.transitionIds.otherBunch,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 알림 목록의 설정 안내 줄·알림 → 알림 설정(MY)·멤버·번치 프로필·번들 상세도 한 단계 들어가는 drill
  {
    from: BUNCH_HOME_PATHS.notifications,
    to: MY_PATHS.notifications,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: BUNCH_HOME_PATHS.notifications,
    to: BUNCH_HOME_PATHS.members,
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: BUNCH_HOME_PATHS.notifications,
    to: BUNCH_HOME_PATHS.transitionIds.otherBunch,
    bidirectional: true,
    transition: bunchDrill,
  },
  historyDrill(BUNCH_HOME_PATHS.notifications, FEED_PATHS.transitionIds.bundle),
  // 역할 권한·번들 작성 화면도 알림에서는 한 단계 들어가는 drill, 추천 후보(번들 만들기 시작)는 번치 홈의 +와 같은 sheet
  {
    from: BUNCH_HOME_PATHS.notifications,
    to: [BUNCH_HOME_PATHS.roles, BUNDLE_PATHS.transitionIds.draft],
    bidirectional: true,
    transition: bunchDrill,
  },
  {
    from: BUNCH_HOME_PATHS.notifications,
    to: BUNDLE_SELECT_PATHS.members,
    bidirectional: true,
    transition: notificationSheet,
  },
  // 콕한 장소도 번치 홈에서 한 단계 들어가는 drill
  {
    from: BUNCH_HOME_PATHS.home,
    to: BUNCH_HOME_PATHS.places,
    bidirectional: true,
    transition: bunchDrill,
  },
  // 콕한 장소 카드 → 그 장소를 담아 온 번들 상세도 한 단계 들어가는 drill(기능명세서 8.1.5)
  {
    from: BUNCH_HOME_PATHS.places,
    to: FEED_PATHS.transitionIds.bundle,
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
  // 알림 → 번치 탭(「작성 중인 번들」 탭 등)도 앞으로 들어가는 이동이라 기록 방향
  historyDrill(BUNCH_HOME_PATHS.home, BUNCH_HOME_PATHS.notifications),
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
  // MY 「약관 및 개인정보」도 다른 MY 하위 화면과 같은 slide(화면설계서는 Dissolve 200ms, 목록 안에서 혼자 달라 통일 #500)
  {
    from: MY_PATHS.home,
    to: MY_PATHS.termsAndPrivacy,
    bidirectional: true,
    transition: menuSubSlide,
  },
  // 약관 및 개인정보 → 약관 원문 화면은 같은 미는 slide(화면설계서에 전환 정의 없음). 동적 route라 고정 id 사용
  {
    from: MY_PATHS.termsAndPrivacy,
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
  // 번들 작성 화면 ↔ 참여 멤버 관리·사진 크게 보기는 온보딩과 같은 슬라이드(300ms). 뒤로 가기는 방향이 반대
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
    to: BUNDLE_PATHS.transitionIds.photoAdd,
    bidirectional: true,
    transition: bundleSlide,
  },
  // 인트로 → 로그인: 화면설계서에 없어 디졸브. 흰 화면에서 어두운 영상 화면으로 바뀌어 가입 화면보다 천천히. 앞으로만 넘어가 한 방향
  { from: INTRO_PATH, to: LOGIN_PATH, transition: introDissolve },
  { from: SIGNUP_PATHS.terms, to: LOGIN_PATH, transition: dissolve },
  // 약관 ↔ 프로필: 가입 단계라 온보딩과 같은 슬라이드, 뒤로 가기는 반대 방향(화면설계서의 디졸브 대신, 2026-11-11 결정)
  { from: SIGNUP_PATHS.terms, to: SIGNUP_PATHS.profile, transition },
  {
    from: SIGNUP_TRANSITION_IDS.termsDocument,
    to: SIGNUP_PATHS.terms,
    transition: dissolve,
  },
  // 가입·참여를 마치고 다음 장면으로: 되돌아오지 않는 이동(replace)이라 한 방향
  { from: SIGNUP_PATHS.profile, to: ONBOARDING_PATHS.start, transition: sceneChange },
  { from: ONBOARDING_PATHS.joinBunchComplete, to: ONBOARDING_PATHS.feed, transition: sceneChange },
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
      {/* 전환 중 화면 뒤를 흰색으로 받침. 인트로 브랜드 장면은 바깥 AppFrame이 Safe Area까지 한 번에 칠하므로 보이는 동안·사라지는 동안 비움
          iOS 쉘의 로그인 화면(transparent)도 WebView 뒤 네이티브 배경 영상이 비치도록 비움 */}
      {/* 접는 헤더 화면(피드)은 본문이 상태 표시줄 뒤까지 올라가므로 위로 상태 표시줄 높이만큼만 더 보이게 자름(가로 전환은 그대로 틀 안) */}
      {/* overflow-x:clip + overflow-y:visible은 WebKit이 세로 ±2^24px 클립 층으로 만들어 iOS에서 내용이 1pt 밀리고 맨 위에 흰 선이 생겨 유한한 clip-path를 씀 */}
      <div className="bg-surface-primary relative isolate flex min-h-0 flex-1 flex-col overflow-hidden has-data-collapsible-header:overflow-visible has-data-collapsible-header:[clip-path:inset(calc(var(--safe-area-top)*-1)_0_0_0)] has-[[data-app-background=brand],[data-app-background=transparent],[data-brand-leaving]]:bg-transparent">
        {children}
      </div>
    </Ssgoi>
  );
}
