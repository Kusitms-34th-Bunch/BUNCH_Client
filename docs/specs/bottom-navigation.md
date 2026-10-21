# 기능: 하단 내비게이션

> Status: Draft(탭 조합·iOS 시스템 탭 바 구현됨, 탭 화면은 임시)
> Date: 2026-10-18, 2026-10-22 갱신

디자인 출처: Figma `BUNCH - 작업파일`의 `BottomNavigationItem`(node `118:973`)과 `BottomNavigation`(node `127:2213`). 값(색·간격·radius·타이포)은 구현 때 `get_design_context`로 확인했고 토큰 대응은 [컴포넌트 spec](../../packages/design-system/src/components/web/bottomNavigation/BottomNavigation.spec.md)에 있다.

## 목적

앱의 주요 화면 네 곳(피드·사진함·번치·MY)을 오가는 하단 탭 막대를 만든다. 선택된 탭이 현재 위치를 보여 준다.

## 문제 정의

탭 화면(번치, 사진함 등)이 구현되기 전에 이동 틀이 없다. 화면마다 탭 막대를 따로 만들면 선택 표시·접근성·눌림 상태가 어긋나고, 탭이 늘거나 디자인이 바뀔 때 여러 곳을 고쳐야 한다.

## 범위 외 항목

- 탭 안의 화면 본문, 탭 화면의 route 구현. 이 기능은 막대와 연결만 한다.
- 알림 배지·종 아이콘. 내부 기획 문서에 알림 종은 번치 탭 화면 안에 있고 하단 탭에는 없다.
- 가운데 쓰기 버튼, 5번째 탭. Figma는 4개 탭이다.
- 탭 화면이 아닌 화면(로그인·약관·프로필 설정, 번들 작업처럼 전체 화면 캔버스)의 이동 틀.
- 어드민 화면 이동. 어드민은 다른 구조를 쓴다.

## 대상 사용자와 접근 권한

가입을 마친 로그인 사용자의 탭 화면. 비로그인과 가입 진행 중 화면에는 막대가 없다. 가입 완료 사용자만 접근하는 규칙은 `docs/specs/login-signup.md`의 접근 규칙을 따르며 이 기능이 새로 만들지 않는다.

## 사용자 흐름과 route

- 탭 4개, 막대 순서: 피드 · 사진함 · 번치 · MY(내부 기획 문서의 화면 구조, Figma 막대와 같은 순서).
- 선택된 탭은 현재 route로 정해진다. 탭을 누르면 그 탭의 route로 이동한다.
- 사진함 탭은 지금 보고 있는 Bunch의 사진함을 바로 연다(내부 기획 문서). 탭 안에서 Bunch를 바꾸지 않는다.
- 탭 route는 임시로 `/feed`·`/photos`·`/bunch`·`/my`다(`features/main-navigation/constants/tabs.ts`). 탭 안 하위 경로(`/bunch/...`)도 그 탭이 선택된다. 같은 탭을 다시 눌렀을 때의 동작(맨 위로 스크롤·새로고침·무반응)은 확인할 항목이다.
- iOS 쉘은 시스템 탭 바가 탭을 그리고 탭마다 WebView가 탭 경로를 연다. 탭 이동은 웹 이동이 아니라 시스템이 화면을 바꾸는 것이다(`docs/decisions/records/012-ios-system-tab-bar.md`).

## 요구사항

### 필수 (Must Have)

- [x] 디자인 시스템 web 구역의 `BottomNavigation`이 항목 목록(id, 라벨, 선택·미선택 아이콘)과 선택 항목을 받아 그린다. 제품 문구·경로·`next/link`는 모른다.
- [x] 선택 항목은 Fill 아이콘·진한 라벨·연한 알약 배경, 미선택 항목은 Line 아이콘·회색 라벨로 보인다.
- [x] 막대는 `nav`로 이름이 있고 현재 항목은 `aria-current="page"`로 노출된다.
- [ ] 항목은 키보드로 이동·실행되고 포커스가 보인다. 터치 영역은 보이는 아이콘보다 크다(`docs/architecture/design-system-icons.md`의 크기와 터치 영역).
- [x] 항목이 링크인지 버튼인지는 호출하는 쪽이 정한다(링크 렌더 방식을 props로 받는다).
- [x] 앱(`apps/web/src/features/main-navigation`)이 탭 4개의 라벨·경로와 현재 탭 판정을 조합한다. `PageShell`의 `bottom` slot 대신 `(app)/(main)` layout이 page 아래에 붙인다(`docs/architecture/app-structure.md`).
- [x] iOS 쉘에서는 시스템 탭 바를 쓰고 웹 막대를 숨긴다. 웹은 탭 라벨·경로를 `setNativeTabBar`로 보내고, 쉘이 false를 돌려주면(브라우저·안드로이드) 웹 막대를 그린다.
- [ ] 하단 위치와 Safe Area는 앱 틀(`AppFrame`, `PageShell`)이 맡고 컴포넌트가 다시 더하지 않는다(`docs/architecture/mobile-shell.md`).

### 있으면 좋은 것 (Nice to Have)

- [x] 프로스트 글라스(`glass` 옵션, 반투명 블러 + 가장자리 반사). 디자인에 정의된 값이 아니라 개발 쪽에서 임의로 적용해 보여 주는 효과다(Figma의 개발 메모). 값은 개발자가 정했고 디자이너 확인 전까지 확정 사양으로 취급하지 않는다. 굴절은 CSS로 낼 수 없어(SVG 변위는 Chromium 전용, iOS WebKit 미지원) 제외했다. 막대 뒤로 사진이 스크롤될 때의 글자 대비는 실기기에서 확인해야 한다.

## 상태

- 로딩: 없음. 항목은 정적 목록이다.
- 빈 상태: 없음.
- 오류: 없음.
- 성공(선택됨): 탭 4개 각각이 선택된 상태가 Figma에 있다(`BottomNavigation` 변형 4개).
- 눌림·포커스·비활성: Figma에서 확인하지 못했다. 확인할 항목.
- 긴 라벨·큰 글꼴·390px 폭: 라벨 한 줄 말줄임과 항목 폭 균등 분배를 구현 때 확인한다.

## API 계약

- 요청: 없음.
- 확인할 항목: 번치 탭 진입 시 현재 Bunch를 어떻게 고르는지(마지막 선택 Bunch 보관 위치)는 Bunch 기능의 계약이다. 이 기능은 경로만 받는다.

## 영향받는 컴포넌트

| 컴포넌트                                         | 변경 사항                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `BottomNavigation`(디자인 시스템 web 구역)       | 새로 만든다. 위치 `packages/design-system/src/components/web/bottomNavigation/`            |
| 탭 조합(`apps/web/src/features/main-navigation`) | 만들었다(`MainTabBar`, 탭 정의, 임시 탭 화면 `TabPlaceholder`)                             |
| `PageShell`, `AppFrame`                          | 변경 없음. `bottom` slot과 Safe Area를 그대로 쓴다                                         |
| Line·Fill Home·Photo·Confetti·User 아이콘        | 있음. 변경 없음                                                                            |
| `docs/architecture/app-structure.md`의 소유 방식 | 갱신했다. `(app)/(main)` layout이 page 아래에 막대를 붙이고 page는 자기 `PageShell`을 쓴다 |

## 구현 단위와 이슈

선행이 있는 단위는 선행이 끝난 뒤에 시작한다. Figma node: `BottomNavigationItem` `118:973`, `BottomNavigation` `127:2213`. 웹·안드로이드 막대는 `docs/decisions/records/011-bottom-navigation-glass-by-platform.md`, iOS 쉘은 `docs/decisions/records/012-ios-system-tab-bar.md`를 따른다.

| 단위                                                                                                           | 타입 | 브랜치명             | 선행                                               | 이슈                                      |
| -------------------------------------------------------------------------------------------------------------- | ---- | -------------------- | -------------------------------------------------- | ----------------------------------------- |
| `BottomNavigation` 컴포넌트와 CSS `glass` 옵션(디자인 시스템 web 구역, web·안드로이드용)                       | feat | bottom-navigation    | #35                                                | #37                                       |
| (대체됨) iOS 쉘 네이티브 글라스 막대: WebView 위 `GlassView` 탭 막대                                           | feat | shell-native-tab-bar | `BottomNavigation`, bridge 계약(`packages/bridge`) | #37에서 구현, #71에서 시스템 탭 바로 대체 |
| 탭 조합과 iOS 시스템 탭 바: 탭 4개의 라벨·경로·현재 탭 판정, 임시 탭 화면, iOS 쉘 시스템 탭 바(탭마다 WebView) | feat | ios-system-tab-bar   | `BottomNavigation`                                 | #71                                       |

- #37의 `GlassView` 막대와 `nativeTabPress` 이벤트는 #71에서 시스템 탭 바로 바꾸면서 지웠다. bridge의 `setNativeTabBar` 항목에는 탭 경로(`path`)가 들어간다.
- 탭 화면 본문은 아직 임시다(`TabPlaceholder`). 각 탭 화면을 구현할 때 이 route를 채운다.
- 남은 순서: 각 탭 화면 구현 → 탭 사이 상태 동기화(번치 전환 등) → 실기기 확인. 구현은 `implement-from-figma`·`create-page-feature`, 쉘은 별도 지침(`docs/architecture/mobile-shell.md`)이다. UI는 `bunch-ui-accessibility-reviewer`, route 변경은 `bunch-route-reviewer`를 부른다.

## 완료 기준

- [ ] 탭 4개가 Figma 순서대로 보이고, 선택·미선택 상태가 Figma와 같다(스크린샷 비교).
- [ ] 키보드로 탭 이동·실행이 되고 현재 탭이 `aria-current`로 노출된다.
- [ ] 탭을 누르면 해당 route로 이동하고, 직접 URL 진입·새로고침·브라우저 뒤로가기에서도 선택이 현재 route와 일치한다.
- [ ] 390px 폭·긴 라벨·큰 글꼴에서 깨지지 않는다.
- [ ] iOS WebView에서 Safe Area 아래에 막대가 가려지지 않고 리퀴드 글래스(적용 시)가 렌더된다(실기기). 효과는 임의 적용이므로 Figma와의 스크린샷 비교 대상에서 제외한다.
- [ ] 관련 test·story가 있고 `yarn check:generated`, 대상 test·lint·typecheck·build-storybook이 통과한다.
- [ ] 구현이 이 spec과 일치하는지 `verify-spec-sync`로 확인한다.

## 확인할 항목

**기획**

- 탭 라벨: 내부 기획 문서는 「MY」, Figma는 「마이페이지」다. 지금은 Figma(「마이페이지」)를 따랐다. 어느 쪽을 쓰는가?
- 탭 route 경로와 같은 탭 재탭 동작, 탭 안 하위 화면에서 선택 유지 여부.
- 어떤 화면에서 탭 막대를 숨기는가(번들 작업·작성 화면, 모달 위, 키보드가 올라올 때).
- 피드와 MY는 아직 구현 전이라 지금은 임시 화면으로 연결했다. 출시 때 숨길지, 비활성으로 둘지 정한다.

**디자인**

- 리퀴드 글래스는 개발 쪽 임의 적용이라 디자이너의 값이 없다. 정식으로 쓸지 디자인에 확인한다.
- iOS 앱의 하단 탭은 시스템 탭 바라 알약 크기·막대 높이·간격·미선택 색(iOS 26)이 Figma와 다르다. Figma 하단 내비게이션은 웹·안드로이드 기준으로 보고 iOS는 시스템 기준을 따른다고 디자이너에게 공유한다.
- 눌림·포커스·비활성 상태. 선택 알약 이동 애니메이션은 Figma에 없어 개발 쪽에서 임의로 넣었다(200ms, 모션 감소 시 즉시 이동). 정식 사양으로 쓸지 확인. 막대를 누른 채 끌어 손을 뗀 탭을 선택하는 동작도 같은 임의 적용이다(웹·iOS 네이티브 막대에 구현, 실제 터치·VoiceOver 미검증).
- 토큰: 막대 배경·선택 알약 배경·라벨 색이 기존 토큰에 있는지.
- `BottomNavigationItem` 시트(순서 피드·번치·마이페이지·사진함)와 막대(피드·사진함·번치·마이페이지)의 순서 차이는 막대를 기준으로 해석했다. 맞는지 확인.

**기술**

- (해결) `PageShell` 소유 방식: layout이 `PageShell` 바깥 아래에 막대를 붙이고 page가 자기 `PageShell`로 헤더를 정한다.
- iOS WebView에서 `backdrop-filter` 렌더와 성능.
- (해결) 탭 조합은 `features/main-navigation`, 현재 탭 판정은 client component `MainTabBar`의 `usePathname`이다.
- iOS 탭 WebView 여러 개의 메모리, 탭 사이 로그인 쿠키 공유, 번치 전환 같은 상태를 다른 탭에 알리는 방법.
- (미정) iOS 탭 화면에서 나오는 길: 쉘은 `setNativeTabBar({ hidden: true })`를 받으면 하나의 WebView로 돌아가지만, 웹이 이를 보내는 곳이 아직 없다. 탭 WebView에서 `(main)` 밖(로그인·온보딩)으로 가면 시스템 탭 바 아래에 그 화면이 뜬다. 로그아웃·인증 만료 이동에서 보낼지, 탭 막대가 사라질 때 보낼지 첫 실제 탭 화면 전에 정한다.
- (미정) iOS 탭 진입 위치: 쉘은 탭 화면으로 바꿀 때 각 탭의 루트 경로를 연다. `/bunch/123`처럼 하위 경로에서 진입하면 `/bunch`로 떨어지고 첫 WebView를 버리며 다시 불러온다. 진입 요청에 현재 경로를 넣을지, 탭 루트 진입만 지원할지 정한다.
- 탭 WebView 안에서 다른 탭 경로로 링크 이동하면 시스템 탭 선택은 그대로이고 내용만 바뀐다. 탭 사이 이동은 시스템 탭 바로만 하도록 링크를 두지 않는다.
