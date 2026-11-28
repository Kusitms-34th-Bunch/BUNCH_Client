'use client';

import {
  Ssgoi,
  type SsgoiConfig,
  type SsgoiTransitionRule,
  type MultiAnimation,
} from '@ssgoi/react';
import { axis, drill, fade, hero, sheet, slide, zoom } from '@ssgoi/react/view-transitions';
import { type ReactNode } from 'react';
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
import { useSwipeBackSettled } from '@/shared/hooks/native/useSwipeBackSettled';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import {
  guardHero,
  guardOutgoing,
  guardPush,
  guardSheet,
  guardZoom,
} from './_transitions/pageGuards';
import { PHOTO_HERO_EASING, PHOTO_HERO_MS } from './_transitions/photoHeroMotion';
import { tabCrossfade } from './_transitions/tabCrossfade';

const SIGNUP_DISSOLVE_DURATION_MS = 300;
// 번치 전환 시트 「새로운 번치 추가하기」 → 번치 시작 선택: 화면설계서는 Dissolve 150ms지만 폰에서 바로 바뀐 것처럼 보여 axis y로(2026-11-20 사용자 결정)
const BUNCH_ADD_AXIS_DURATION_MS = 300;
// 인트로 → 로그인 교차 디졸브 시간(디자이너 요청, 화면설계서 값 없음). 흰 가이드에서 어두운 영상 화면으로 바뀌어 가입 화면(300ms)보다 천천히
const INTRO_LOGIN_DISSOLVE_DURATION_MS = 500;
// 화면 이동(drill·slide) 시간·곡선: 설계서 값(150~300ms)보다 길고, motion.md 기본(ease-out)과 달리 천천히 시작해 길게 감속(근거 docs/architecture/motion.md)
// 실기기는 새 화면 첫 그림까지 약 90ms가 걸려 그동안 이동이 지나감(ease-out 250ms는 첫 프레임에 약 48%)
const PUSH_DURATION_MS = 350;
const PUSH_EASING = [0.4, 0, 0.2, 1] as const;
// 가입 완료 → 번치 시작, 초대 참여 완료 → 피드: 한 흐름을 마치고 다음 장면으로 넘어가는 이동(화면설계서에 정의 없음, 2026-11-20 사용자 결정)
const SCENE_CHANGE_DURATION_MS = 300;

const tuneTransition =
  (durationMs: number) =>
  ({ animation }: { animation: MultiAnimation<'out' | 'in'> }) => {
    animation.set({ integrator: easeOutIntegrator(durationMs) });
    guardOutgoing(animation);
  };
// 상태 바 영역도 화면마다 자기 색 띠로 함께 밀림(guardPush)
const tunePush = ({ animation }: { animation: MultiAnimation<'out' | 'in'> }) => {
  animation.set({ integrator: cubicBezierIntegrator(PUSH_DURATION_MS, PUSH_EASING) });
  guardPush(animation);
};
// 순서가 있는 단계·한 단계 들어가는 하위 화면의 미는 slide(온보딩·가입·메뉴 하위·MY 하위·번들 작성 하위·추천 번들)
const pushSlide = slide({}, { override: { forward: tunePush, backward: tunePush } });
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
// 들어오는 화면은 오른쪽에서, 뒤 화면은 왼쪽으로 20% 함께 밀림
const bunchDrill = drill(
  {},
  {
    override: { forward: tunePush, backward: tunePush },
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
// 사진함 썸네일 → 사진 상세 hero(Figma에 정의 없음, 시간·곡선은 photoHeroMotion). 돌아갈 때는 부드러운 spring(smooth) 그대로(사용자 확인)
// 사진함에서 앱 안 이동으로 열면 겹쳐 띄운 상세(@overlay)가 직접 움직이고, 이 규칙은 주소로 바로 연 상세에서 돌아갈 때 씀(결정 기록 032)
const tunePhotoHero = ({ animation }: { animation: MultiAnimation<'shared' | 'out' | 'in'> }) => {
  animation.set({ integrator: cubicBezierIntegrator(PHOTO_HERO_MS, PHOTO_HERO_EASING) });
  guardHero({ animation });
};
const photoHero = hero(
  { type: 'fade', variant: 'smooth' },
  { override: { forward: tunePhotoHero, backward: guardHero } },
);
// 피드 말풍선 → 번들 상세(댓글): 눌린 카드가 상세 화면 전체로 열리는 zoom static(뒤 피드는 그대로, 뒤로 가면 카드로 접힘)
// 상세를 이미 댓글 위치로 내려 두고 열어 사진이 이어지는 hero 대신 씀(motion.md). 나가는 화면은 경계 id로 찾아 다른 전환과 같은 표식
// 시간·곡선: 기본 spring은 약 0.2초에 90%라 빠르게 느껴져, 바로 출발하되 90%를 약 0.25초로 늦춘 450ms 감속 곡선(#568)
const ZOOM_MS = 450;
const ZOOM_EASING = [0.3, 0.7, 0.4, 1] as const;
const tuneZoom =
  (opening: boolean, behindIds: readonly string[], frontId: string) =>
  (params: Parameters<ReturnType<typeof guardZoom>>[0]) => {
    params.animation.set({ integrator: cubicBezierIntegrator(ZOOM_MS, ZOOM_EASING) });
    guardZoom(opening, behindIds, frontId)(params);
  };
const zoomOver = (behindIds: readonly string[], frontId: string) =>
  zoom(
    { type: 'static' },
    {
      override: {
        forward: tuneZoom(true, behindIds, frontId),
        backward: tuneZoom(false, behindIds, frontId),
      },
    },
  );
const feedCommentsZoom = zoomOver([MAIN_TAB_PATHS.feed], FEED_PATHS.transitionIds.bundleComments);
// 번치 탭·다른 번치 프로필 격자 → 번들 상세: 인스타 프로필 그리드 → 게시물(SSGOI showcase Instagram 「Grid → Post」 zoom static)
const bunchGridZoom = zoomOver(
  [BUNCH_HOME_PATHS.home, BUNCH_HOME_PATHS.transitionIds.otherBunch],
  FEED_PATHS.transitionIds.bundle,
);
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
    transition: pushSlide,
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
  // 번치 탭·다른 번치 프로필의 번들 격자 → 상세는 칸이 상세 화면 전체로 열리는 zoom static(인스타 프로필 그리드 → 게시물, 사용자 결정)
  // 칸 사진을 상세 첫 사진으로 잇는 hero로 바꾸려면 transition만 feedBundleHero로(칸의 hero 키·자르기는 그대로 둠, motion.md)
  {
    from: [BUNCH_HOME_PATHS.home, BUNCH_HOME_PATHS.transitionIds.otherBunch],
    to: FEED_PATHS.transitionIds.bundle,
    bidirectional: true,
    transition: bunchGridZoom,
  },
  // 상세의 번치 이름 → 번치 탭·다른 번치 프로필은 새 화면으로 들어가는 drill(이동 직전에 상세 틀 id를 바꿔 위 zoom과 구분, BundleDetail)
  {
    from: FEED_PATHS.transitionIds.bundleToBunch,
    to: [BUNCH_HOME_PATHS.home, BUNCH_HOME_PATHS.transitionIds.otherBunch],
    transition: bunchDrill,
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
    transition: pushSlide,
  },
  // MY 프로필 행 → 개인 프로필 수정도 번치 프로필 편집과 같은 미는 slide(화면설계서에 전환 정의 없음, 2026-11-05 사용자 결정)
  {
    from: MY_PATHS.home,
    to: MY_PATHS.profile,
    bidirectional: true,
    transition: pushSlide,
  },
  // MY 알림 설정도 같은 미는 slide(화면설계서에 전환 정의 없음, 프로필 수정과 맞춤)
  {
    from: MY_PATHS.home,
    to: MY_PATHS.notifications,
    bidirectional: true,
    transition: pushSlide,
  },
  // MY 회원 탈퇴도 같은 미는 slide(화면설계서에 전환 정의 없음)
  {
    from: MY_PATHS.home,
    to: MY_PATHS.withdrawal,
    bidirectional: true,
    transition: pushSlide,
  },
  // 탈퇴 안내 → 관리자 권한 이전도 같은 미는 slide(화면설계서에 전환 정의 없음)
  {
    from: MY_PATHS.withdrawal,
    to: MY_PATHS.withdrawalTransfer,
    bidirectional: true,
    transition: pushSlide,
  },
  // MY 「약관 및 개인정보」도 다른 MY 하위 화면과 같은 slide(화면설계서는 Dissolve 200ms, 목록 안에서 혼자 달라 통일 #500)
  {
    from: MY_PATHS.home,
    to: MY_PATHS.termsAndPrivacy,
    bidirectional: true,
    transition: pushSlide,
  },
  // 약관 및 개인정보 → 약관 원문 화면은 같은 미는 slide(화면설계서에 전환 정의 없음). 동적 route라 고정 id 사용
  {
    from: MY_PATHS.termsAndPrivacy,
    to: MY_PATHS.transitionIds.terms,
    bidirectional: true,
    transition: pushSlide,
  },
  // 멤버 관리와 권한 안내도 메뉴 하위 화면과 같은 미는 slide(화면설계서에 전환 정의 없음)
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.members,
    bidirectional: true,
    transition: pushSlide,
  },
  {
    from: BUNCH_HOME_PATHS.members,
    to: BUNCH_HOME_PATHS.roles,
    bidirectional: true,
    transition: pushSlide,
  },
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.leave,
    bidirectional: true,
    transition: pushSlide,
  },
  // 번치 삭제 안내 → 확인 문구 입력도 한 단계씩 들어가는 slide
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.delete,
    bidirectional: true,
    transition: pushSlide,
  },
  {
    from: BUNCH_HOME_PATHS.delete,
    to: BUNCH_HOME_PATHS.deleteConfirm,
    bidirectional: true,
    transition: pushSlide,
  },
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.blocked,
    bidirectional: true,
    transition: pushSlide,
  },
  // 멤버 초대는 멤버 관리 헤더와 더보기 메뉴 두 곳에서 들어옴
  {
    from: BUNCH_HOME_PATHS.members,
    to: BUNCH_HOME_PATHS.invite,
    bidirectional: true,
    transition: pushSlide,
  },
  {
    from: BUNCH_HOME_PATHS.menu,
    to: BUNCH_HOME_PATHS.invite,
    bidirectional: true,
    transition: pushSlide,
  },
  {
    from: BUNDLE_SELECT_PATHS.select,
    to: BUNDLE_SELECT_PATHS.transitionIds.recommendation,
    bidirectional: true,
    transition: pushSlide,
  },
  // 번들 작성 화면 ↔ 참여 멤버 관리·사진 크게 보기는 온보딩과 같은 슬라이드(300ms). 뒤로 가기는 방향이 반대
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.members,
    bidirectional: true,
    transition: pushSlide,
  },
  // 작성 화면 → 대표 사진 투표(「픽하기 >」)도 참여 멤버 관리와 같은 슬라이드
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.pick,
    bidirectional: true,
    transition: pushSlide,
  },
  // 작성 화면 → 공개 범위(업로드 직전)도 같은 슬라이드
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.visibility,
    bidirectional: true,
    transition: pushSlide,
  },
  // 작성 화면 → 사진 상세(크게 보기)도 같은 슬라이드
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.viewer,
    bidirectional: true,
    transition: pushSlide,
  },
  {
    from: BUNDLE_PATHS.transitionIds.draft,
    to: BUNDLE_PATHS.transitionIds.photoAdd,
    bidirectional: true,
    transition: pushSlide,
  },
  // 인트로 → 로그인: 화면설계서에 없어 디졸브. 흰 화면에서 어두운 영상 화면으로 바뀌어 가입 화면보다 천천히. 앞으로만 넘어가 한 방향
  { from: INTRO_PATH, to: LOGIN_PATH, transition: introDissolve },
  { from: SIGNUP_PATHS.terms, to: LOGIN_PATH, transition: dissolve },
  // 약관 ↔ 프로필: 가입 단계라 온보딩과 같은 슬라이드, 뒤로 가기는 반대 방향(화면설계서의 디졸브 대신, 2026-11-11 결정)
  { from: SIGNUP_PATHS.terms, to: SIGNUP_PATHS.profile, transition: pushSlide },
  {
    from: SIGNUP_TRANSITION_IDS.termsDocument,
    to: SIGNUP_PATHS.terms,
    transition: dissolve,
  },
  // 가입·참여를 마치고 다음 장면으로: 되돌아오지 않는 이동(replace)이라 한 방향
  { from: SIGNUP_PATHS.profile, to: ONBOARDING_PATHS.start, transition: sceneChange },
  { from: ONBOARDING_PATHS.joinBunchComplete, to: ONBOARDING_PATHS.feed, transition: sceneChange },
  { from: ONBOARDING_PATHS.start, to: ONBOARDING_PATHS.createBunch, transition: pushSlide },
  { from: ONBOARDING_PATHS.start, to: ONBOARDING_PATHS.joinBunch, transition: pushSlide },
  {
    from: ONBOARDING_PATHS.createBunchComplete,
    to: ONBOARDING_PATHS.createBunchInvite,
    transition: pushSlide,
  },
];

export function AppTransitions({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  // iOS 쉘 스와이프 뒤로 가기: 전환은 SSGOI 패치가 건너뛰고, 돌아간 화면을 그린 뒤 쉘이 덮개를 걷게 알림(#587)
  useSwipeBackSettled();
  const config: SsgoiConfig = { transitions: reducedMotion ? [] : rules };
  return (
    <Ssgoi config={config}>
      {/* 전환 중 화면 뒤를 흰색으로 받침. 인트로 브랜드 장면은 바깥 AppFrame이 Safe Area까지 한 번에 칠하므로 보이는 동안·사라지는 동안 비움
          iOS 쉘의 로그인 화면(transparent)도 WebView 뒤 네이티브 배경 영상이 비치도록 비움 */}
      {/* 접는 헤더 화면(피드)은 본문이 상태 표시줄 뒤까지 올라가므로 위로 상태 표시줄 높이만큼만 더 보이게 자름(가로 전환은 그대로 틀 안) */}
      {/* overflow-x:clip + overflow-y:visible은 WebKit이 세로 ±2^24px 클립 층으로 만들어 iOS에서 내용이 1pt 밀리고 맨 위에 흰 선이 생겨 유한한 clip-path를 씀 */}
      <div className="bg-surface-primary relative isolate flex min-h-0 flex-1 flex-col overflow-hidden has-data-collapsible-header:overflow-visible has-data-collapsible-header:[clip-path:inset(calc(var(--safe-area-top)*-1)_0_0_0)] has-data-push-band:overflow-visible has-data-push-band:[clip-path:inset(calc(var(--safe-area-top)*-1)_0_0_0)] has-data-sheet-band:overflow-visible has-data-sheet-band:[clip-path:inset(calc(var(--safe-area-top)*-1)_0_calc(var(--safe-area-bottom)*-1)_0)] has-[[data-app-background=brand],[data-app-background=transparent],[data-brand-leaving]]:bg-transparent">
        {children}
      </div>
    </Ssgoi>
  );
}
