# 기능: 하단 내비게이션

> Status: Draft
> Date: 2026-10-18

디자인 출처: Figma `BUNCH - 작업파일`의 `BottomNavigationItem`(node `118:973`)과 `BottomNavigation`(node `127:2213`). 값(색·간격·radius·타이포)은 구현 때 `get_design_context`로 확인했고 토큰 대응은 컴포넌트 spec(`BottomNavigation.spec.md`)에 있다.

## 목적

앱의 주요 화면 네 곳(피드·사진함·번치·MY)을 오가는 하단 탭 막대를 만든다. 선택된 탭이 현재 위치를 보여 준다.

## 문제 정의

탭 화면(번치, 사진함 등)이 구현되기 전에 이동 틀이 없다. 화면마다 탭 막대를 따로 만들면 선택 표시·접근성·눌림 상태가 어긋나고, 탭이 늘거나 디자인이 바뀔 때 여러 곳을 고쳐야 한다.

## 범위 외 항목

- 탭 안의 화면 본문, 탭 화면의 route 구현. 이 기능은 막대와 연결만 한다.
- 알림 배지·종 아이콘. PRD(10/14)에 알림 종은 번치 탭 화면 안에 있고 하단 탭에는 없다.
- 가운데 쓰기 버튼, 5번째 탭. Figma는 4개 탭이다.
- 탭 화면이 아닌 화면(로그인·약관·프로필 설정, 번들 작업처럼 전체 화면 캔버스)의 이동 틀.
- 어드민 화면 이동. 어드민은 다른 구조를 쓴다.

## 대상 사용자와 접근 권한

가입을 마친 로그인 사용자의 탭 화면. 비로그인과 가입 진행 중 화면에는 막대가 없다. 가입 완료 사용자만 접근하는 규칙은 `docs/specs/login-signup.md`의 접근 규칙을 따르며 이 기능이 새로 만들지 않는다.

## 사용자 흐름과 route

- 탭 4개, 막대 순서: 피드 · 사진함 · 번치 · MY(PRD 화면 구조 10/14, Figma 막대와 같은 순서).
- 선택된 탭은 현재 route로 정해진다. 탭을 누르면 그 탭의 route로 이동한다.
- 사진함 탭은 지금 보고 있는 Bunch의 사진함을 바로 연다(PRD). 탭 안에서 Bunch를 바꾸지 않는다.
- 탭 route 경로, 같은 탭을 다시 눌렀을 때의 동작(맨 위로 스크롤·새로고침·무반응), 탭 안 하위 화면에서도 선택이 유지되는지는 확인할 항목이다.

## 요구사항

### 필수 (Must Have)

- [ ] 디자인 시스템 web 구역의 `BottomNavigation`이 항목 목록(id, 라벨, 선택·미선택 아이콘)과 선택 항목을 받아 그린다. 제품 문구·경로·`next/link`는 모른다.
- [ ] 선택 항목은 Fill 아이콘·진한 라벨·연한 알약 배경, 미선택 항목은 Line 아이콘·회색 라벨로 보인다.
- [ ] 막대는 `nav`로 이름이 있고 현재 항목은 `aria-current="page"`로 노출된다.
- [ ] 항목은 키보드로 이동·실행되고 포커스가 보인다. 터치 영역은 보이는 아이콘보다 크다(`docs/architecture/design-system-icons.md`의 크기와 터치 영역).
- [ ] 항목이 링크인지 버튼인지는 호출하는 쪽이 정한다(링크 렌더 방식을 props로 받는다).
- [ ] 앱(`apps/web` features)이 탭 4개의 라벨·경로와 현재 탭 판정을 조합해 `PageShell`의 `bottom` slot에 넣는다.
- [ ] 하단 위치와 Safe Area는 앱 틀(`AppFrame`, `PageShell`)이 맡고 컴포넌트가 다시 더하지 않는다(`docs/architecture/mobile-shell.md`).

### 있으면 좋은 것 (Nice to Have)

- [ ] 리퀴드 글래스 스타일(반투명 블러). 디자인에 정의된 값이 아니라 개발 쪽에서 임의로 적용해 보여 주는 효과다(Figma의 개발 메모). 값은 개발자가 정하고 디자이너 확인 전까지 확정 사양으로 취급하지 않는다. 막대 뒤로 사진이 스크롤될 때의 글자 대비를 확인한다.

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

| 컴포넌트                                         | 변경 사항                                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `BottomNavigation`(디자인 시스템 web 구역)       | 새로 만든다. 위치 `packages/design-system/src/components/web/bottomNavigation/`                                      |
| 탭 조합(`apps/web/src/features/`)                | 새로 만든다. 폴더 이름은 `main-navigation`을 제안하며 확정은 확인할 항목                                             |
| `PageShell`, `AppFrame`                          | 변경 없음. `bottom` slot과 Safe Area를 그대로 쓴다                                                                   |
| Line·Fill Home·Photo·Confetti·User 아이콘        | 있음. 변경 없음                                                                                                      |
| `docs/architecture/app-structure.md`의 소유 방식 | 탭 화면 구현 때 정하겠다고 적힌 항목(layout이 `PageShell`을 소유할지, 각 page가 `bottom`에 넣을지)을 결정해 갱신한다 |

## 구현 단위와 이슈

선행이 있는 단위는 선행이 끝난 뒤에 시작한다. Figma node: `BottomNavigationItem` `118:973`, `BottomNavigation` `127:2213`.

| 단위                                                                                                                 | 타입 | 브랜치명          | 선행                                     | 이슈 |
| -------------------------------------------------------------------------------------------------------------------- | ---- | ----------------- | ---------------------------------------- | ---- |
| `BottomNavigation` 컴포넌트: 항목·선택 상태·접근성·스토리·테스트(디자인 시스템 web 구역)                             | feat | bottom-navigation | #35(디자인 시스템 core/web 구역)         |      |
| (보류) 탭 조합: 탭 4개의 라벨·경로·현재 탭 판정, `PageShell` `bottom` 연결, 소유 방식 결정과 `app-structure.md` 갱신 | feat | main-navigation   | `BottomNavigation`, 연결할 탭 화면 route | 없음 |

- 탭 조합은 연결할 탭 화면(번치·사진함 등)이 아직 없어서 이슈를 만들지 않는다. 첫 탭 화면이 생기는 시점(PRD 순위 2)에 이슈를 만든다.
- 두 단위는 목적과 reviewer가 달라(UI 접근성 vs route·접근) 나눈다.
- 권장 순서: `BottomNavigation` → (첫 탭 화면 route가 생긴 뒤) 탭 조합. 구현은 `implement-from-figma`·`create-ds-component`, 조합은 `create-page-feature`로 이어지고, UI는 `bunch-ui-accessibility-reviewer`, route 변경은 `bunch-route-reviewer`를 부른다.

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

- 탭 라벨: PRD는 「MY」, Figma는 「마이페이지」다. 어느 쪽을 쓰는가?
- 탭 route 경로와 같은 탭 재탭 동작, 탭 안 하위 화면에서 선택 유지 여부.
- 어떤 화면에서 탭 막대를 숨기는가(번들 작업·작성 화면, 모달 위, 키보드가 올라올 때).
- 피드와 MY는 UT 이후(PRD 순위 3)에 구현되는데, 그 전까지 이 탭을 숨기는가, 비활성으로 두는가, 임시 화면으로 연결하는가.

**디자인**

- 리퀴드 글래스는 개발 쪽 임의 적용이라 디자이너의 값이 없다. 정식으로 쓸지 디자인에 확인한다.
- 눌림·포커스·비활성 상태, 전환 애니메이션 유무.
- 토큰: 막대 배경·선택 알약 배경·라벨 색이 기존 토큰에 있는지.
- `BottomNavigationItem` 시트(순서 피드·번치·마이페이지·사진함)와 막대(피드·사진함·번치·마이페이지)의 순서 차이는 막대를 기준으로 해석했다. 맞는지 확인.

**기술**

- `PageShell` 소유 방식: layout이 소유하면 탭마다 다른 헤더를 넣기 어렵고, 각 page가 `bottom`에 넣으면 코드가 반복된다. 탭 화면마다 헤더 종류가 다르므로(Figma `Header` variant) 각 page가 `bottom`에 넣는 쪽을 먼저 검토한다.
- iOS WebView에서 `backdrop-filter` 렌더와 성능.
- 탭 조합 폴더 이름(`features/main-navigation` 제안)과 `usePathname`으로 현재 탭을 판정하는 위치(client component 경계).
