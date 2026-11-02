# Motion

web 페이지 전환은 `@ssgoi/react` 7.4.1을 사용한다. 컴포넌트와 admin 모션에는 CSS transition·Web Animations API를 사용하며, 아래 기준을 함께 따른다.

## 애니메이션을 넣을지 판단

| 사용 빈도                                       | 판단              |
| ----------------------------------------------- | ----------------- |
| 하루 100번+ (키보드 단축키, 커맨드 팔레트 토글) | 애니메이션 없음   |
| 하루 수십 번 (hover, 목록 탐색)                 | 제거하거나 최소화 |
| 가끔 (모달, drawer, toast)                      | 기본 애니메이션   |
| 드묾 (온보딩, 축하, 최초 피드백)                | 장식적 요소 허용  |

모션의 유효한 목적은 공간적 일관성, 상태 전달, 설명, 피드백, 급격한 변화 완충이다. "예뻐 보여서"는 자주 보이는 요소에 넣는 이유로는 부족하다.

## Easing과 duration

- 진입·이탈은 `ease-out`, 화면 안에서의 이동·모핑은 `ease-in-out`, hover·색상 전환은 `ease`, 등속(마퀴, 진행바)은 `linear`를 쓴다.
- 기본 진입에는 `ease-in`을 피한다. 온보딩의 페이지 Slide In은 끝에서 감속하도록 Ease Out 300ms를 적용한다.
- duration 기준: 버튼 피드백 100–160ms, 툴팁·작은 팝오버 125–200ms, 드롭다운·셀렉트 150–250ms, 모달·drawer 200–500ms. UI 애니메이션은 300ms를 넘지 않는다.

## 물리감

- `scale(0)`에서 시작하지 않는다. `scale(0.9~0.97)` + `opacity: 0`에서 시작한다.
- 팝오버·드롭다운은 트리거 쪽에서 자라나도록 `transform-origin`을 트리거 위치에 맞춘다. 모달은 예외로, 화면 중앙에 뜨므로 `transform-origin: center`를 유지한다.
- 버튼 눌림 피드백은 디자이너 공통 지침 `Dissolve / Ease Out / 75ms`를 따른다(2026-10-22, 이전 100ms). 크기를 바꾸지 않고 눌림 오버레이의 투명도만 75ms ease-out으로 바꾼다. 적용: `Button`, `TextButton`, `LoginButton`, `Label`, `TermsLabel`, `CameraButton`(디자인 시스템). 동작 줄이기에서는 전환을 끈다. 곡선은 `Button`·`TextButton`이 CSS Ease Out(`cubic-bezier(0,0,0.58,1)`), 나머지는 Tailwind `ease-out`(`cubic-bezier(0,0,0.2,1)`)이라 아직 다르다.

## 성능

- `transform`과 `opacity`만 애니메이션한다. `width`, `height`, `top`, `left`, `padding`, `margin`을 애니메이션하면 매 프레임 layout을 다시 계산해 jank가 생긴다.
- 모션 라이브러리를 도입하면, 짧은 shorthand API(예: `x`/`y`/`scale`을 직접 넘기는 형태)가 실제로 하드웨어 가속되는 transform 문자열로 적용되는지 확인한다. 라이브러리에 따라 shorthand가 메인 스레드에서 계산되어 부하 상황에 프레임을 떨어뜨릴 수 있다.
- toast 추가, toggle처럼 빠르게 반복 트리거되는 대상은 `@keyframes`보다 CSS `transition`을 쓴다. transition은 진행 중에 재시작되면 현재 값에서 이어지지만, keyframes는 처음부터 다시 시작한다.

## 접근성

- `prefers-reduced-motion: reduce`를 존중한다. 모든 모션을 없애는 게 아니라 이동·위치 변화 중심의 모션은 줄이거나 제거하고, 상태 전달에 필요한 opacity·색상 전환은 남긴다.
- hover 애니메이션은 `@media (hover: hover) and (pointer: fine)`로 감싼다. 터치 기기는 탭에서도 hover 이벤트가 발생해 의도치 않게 재생된다.

## Stagger

그룹 진입 애니메이션은 항목 간 30–80ms 간격으로 순차 적용한다. 그 이상 벌어지면 느리게 느껴진다. stagger는 장식이므로, 재생 중에도 사용자의 interaction을 막지 않는다.

## 공통 모션(Figma 공통 모션)

Figma `공통 모션`(node `1962:18333`)이 정한 값이다. 디자이너가 지정한 값이라 위의 "UI 애니메이션은 300ms를 넘지 않는다"보다 우선한다. `transform`·`opacity` 중심이다(토스트는 sonner가 쓰는 `height` 전환도 같은 곡선으로 유지한다). 동작 줄이기에서는 이동·높이 전환을 빼고 투명도 전환만 남긴다.

| 대상                | Figma 값                                                                                                                                                 | 구현                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 토스트              | Smart animation, `0, 0, 0.35, 1`, 350ms. 등장 5px 위로 이동·0%→100%, 퇴장 5px 아래로 이동·100%→0%. 노출 3초, 액션 버튼 포함 5초                          | `Toaster`가 sonner 항목에 transition을 덮어씀. 퇴장은 sonner가 200ms 뒤 항목을 제거해 200ms에 끝나게 함. 노출 시간은 `toast()`가 정함(액션이 있으면 5초)                                                                        |
| 팝오버 메뉴         | Smart animation, Gentle, 400ms. 열기 38px 위로 이동·0%→100%, 닫기 38px 아래로 이동·100%→0%(닫기 시간은 Figma에 없음)                                     | `Menu`의 `open`·`onExited`. Gentle은 스프링 프리셋(stiffness 100·damping 15·mass 1)이라 400ms 구간을 `cubic-bezier(0.22, 0, 0.4, 0.94)`로 근사(오차 0.3% 이내). 닫기도 400ms                                                    |
| 참여 멤버 카드 이동 | Smart animation, Gentle, 400ms(화면설계서 `2034:22714` 「멤버카드 목록 이동 인터랙션」). 「멤버 추가하기」와 「참여 멤버」 사이로 카드가 옮겨갈 때       | `useMoveAnimation`: 상태를 바꾸기 직전 위치를 기억하고 렌더 직후 달라진 만큼 `transform`으로 이동(FLIP). 곡선은 팝오버 메뉴와 같은 `cubic-bezier(0.22, 0, 0.4, 0.94)`로 근사, 동작 줄이기에서는 이동하지 않음                   |
| 번들 사진 삭제      | Smart Animate, Slow, 350ms(화면설계서 `2034:24751`의 「사진 삭제 인터랙션」). 사진을 빼면 남은 사진과 「+ 사진 추가」 카드가 빈자리를 메우며 이동        | `useMoveAnimation(SLOW_MOVE)`(FLIP). Slow(스프링 80·20·1)는 과감쇠라 0.92초에 99%에 닿으므로 350ms 구간으로 압축해 `cubic-bezier(0.24, 0.3, 0.14, 1)`로 근사(오차 0.6% 이내). 이동 동안 스크롤 스냅을 꺼야 목록이 끌려가지 않음 |
| 칩 버튼             | 누르는 동안 Hover, 손을 떼면 Selected. 둘 다 Dissolve·Ease out·300ms                                                                                     | `ChipButton`의 색 transition과 오버레이 투명도 300ms. 눌리는 동안(`active`)과 마우스 호버가 같은 Hover 모양                                                                                                                     |
| 버튼                | 누르는 동안 Dissolve·Ease out·75ms                                                                                                                       | 위 "Easing과 duration"의 버튼 눌림 항목                                                                                                                                                                                         |
| 바텀시트            | `0, 0, 0.35, 1`. 열기 340ms 아래에서 위로·40%→100%, 닫기 160ms 위에서 아래로·100%→40%. 드래그를 놓으면 내려가며 닫힘                                     | `BottomSheet`의 Popup·Backdrop transition. 끄는 동안은 transition을 끄고 손을 따라 움직인다. `40%→100%`는 토스트와 같은 표기라 투명도로 해석                                                                                    |
| 모달                | 패널 중앙에서 opacity 0→1·scale 1.3→1, 200ms `0.03, 0.4, 0.1, 1`. 딤 100ms `0, 0, 0.15, 1`. 닫힘은 크기 유지·패널과 딤 100ms `0.35, 0, 1, 1` 페이드 아웃 | `Dialog`(`ConfirmDialog`·`ActionDialog` 포함)의 Popup·Backdrop 기본 transition. 값 출처는 온보딩 나가기 모달(`BunchMood.spec.md`)                                                                                               |
| 메뉴 탭(아이콘)     | 탭을 누르면 Dissolve·Ease out·75ms(화면설계서 `1892:37781` 3번)                                                                                          | `MenuTabs.IconTab`이 겹친 Line·Fill 아이콘 투명도·색·밑줄을 75ms ease-out으로 바꿈. 번치 홈 탭 패널은 75ms 페이드 인(`page-content-in`)                                                                                         |

- 위쪽 토스트(`toast`의 `position: 'top'`, 사진 캡션 화면): 같은 곡선·350ms로 등장은 5px 아래로 내려오며 0%→100%, 퇴장은 5px 위로 올라가며 100%→0%(화면설계서 `2034:24751` 3번, Chrome에서 프레임 측정으로 44→49px·49→44px 확인).
- 토스트·메뉴처럼 반복해서 열리는 요소는 `@keyframes`보다 transition을 우선하지만, 메뉴는 열릴 때마다 처음부터 재생하는 모양이라 `@keyframes`를 쓴다(닫는 도중 다시 열면 현재 위치에서 이어지지 않는 점은 수용).
- Gentle 값(100·15·1)은 Figma 프리셋의 알려진 값 기준이고 노드 데이터에서는 직접 확인하지 못했다. 디자이너가 다른 값을 쓰면 곡선만 바꾼다.
- 칩 버튼의 "Ease out"은 지금 Tailwind `ease-out`(`cubic-bezier(0, 0, 0.2, 1)`)이다. 버튼 눌림 항목과 마찬가지로 CSS 표준 곡선과 다르다.

## Lottie

디자이너가 Lottie 애니메이션을 전달할 예정이다(2026-10-14). 온보딩에 쓸 예정이고, 로그인 화면에 쓸지는 미정이다. 재생 라이브러리는 `lottie-react`(3.1.2, 2026-10-19 사용자 확인 후 `apps/web`에 추가)다. 아래는 도입 기준과 첫 도입(초대 링크 확인 화면 `BunchJoinMotion`)의 결과다.

- 온보딩은 로그인 뒤에 나오므로, 첫 화면 로딩을 늦추지 않고 동적 import로 자산을 받을 수 있다. 온보딩 한 단계가 보이는 동안 다음 단계의 자산을 미리 받아 두면 전환할 때 끊기지 않는다(FE 판단). 로그인 화면에 쓰기로 정해지면 그 화면은 첫 렌더가 늦어질 수 있으니 다시 판단한다.
- 자산 형식(`.json` 또는 압축된 `.lottie`)과 재생 라이브러리는 디자이너의 자산을 받은 뒤 정한다. 다른 프로젝트에서는 `lottie-react`를 썼다. production dependency 추가는 사용자 확인을 받는다.
- 웹 앱의 로티 JSON은 `apps/web/src/shared/assets/lotties/`에서 관리한다. 재생 컴포넌트와 기능 로직은 사용하는 feature에 둔다. 앱 전용 자산을 디자인 시스템으로 옮기지 않는다.
- 재생 컴포넌트는 브라우저 API를 쓰므로 클라이언트 컴포넌트(`'use client'`)로 둔다. 서버 컴포넌트에서 직접 import하지 않는다.
- 자산이 50KB 이상이면 동적 import로 쓰는 시점에 받는다(제안). 정적 import하면 그 화면 번들에 JSON 전체가 들어간다. PR에는 자산 용량을 적는다.
- `prefers-reduced-motion: reduce`이면 자동 재생과 반복을 끄고 정지 프레임을 보여준다. 애니메이션을 유일한 정보 전달 수단으로 쓰지 않고, 같은 정보를 텍스트로도 준다.
- 장식용이면 `aria-hidden`을 주고, 의미가 있으면 텍스트 대체를 함께 준다.
- 컨테이너 크기를 고정해서, 자산을 받기 전후에 layout이 밀리지 않게 한다.
- 위 "애니메이션을 넣을지 판단" 표를 따른다. 자주 보는 요소에는 쓰지 않고 온보딩, 축하, 로딩 같은 드문 장면에 쓴다. "UI 애니메이션은 300ms를 넘지 않는다"는 전환에 대한 규칙이라 Lottie 연출 길이에는 적용하지 않지만, 재생 중에도 사용자의 interaction을 막지 않는다.
- 복잡한 애니메이션은 WebView에서 프레임이 떨어질 수 있다. 렌더러 선택과 프레임은 실기기에서 확인한다(FE 판단, 미검증).
- 테스트에서는 재생 라이브러리를 mock한다. 애니메이션의 모양은 테스트하지 않는다.
- 도입 결과 (2026-10-19): `lottie-react` 3.x는 엔진 세 빌드(full·svg·light)를 함께 내보내서 모듈 전체를 동적 `import()`하면 셋이 모두 내려받아진다(합계 약 180KB gzip). 표현식이 없는 로티는 light 빌드만 쓰도록 `export { LottieLight } from 'lottie-react'` 래퍼(`lib/lottieLight.ts`)를 동적 import해서 엔진 하나(약 164KB)와 래퍼(약 47KB)만 내려받는다. 새 로티를 넣을 때 표현식이 있으면 `LottieSvg`로 바꾼다.
- 자산 위치 (확정): 초대장 로티는 `apps/web/src/shared/assets/lotties/inviteAnimation.json`에 둔다. 재생 컴포넌트에서 JSON을 동적 import한다.
- 로딩 상태 (2026-10-31, 앞으로의 기준): 「편집 중」(Editing)이 아닌 로딩 표시는 모두 디자이너가 전달한 `loading.json`(70×28, 원본 4.7KB·저장소 서식 적용 후 12KB, 표현식 없음)으로 처리한다. 사진별·요소별이 아니라 페이지 전체에 하며, 화면 전체를 `overlay-dim-subtle`로 덮고 가운데에 점 3개를 재생한다(Figma 사진함_12). 자산은 `apps/web/src/shared/assets/lotties/loading.json`, 공통 컴포넌트는 `shared/components/loading/PageLoading.tsx`(dim + 점)와 `LoadingDots.tsx`(light 엔진을 `shared/lib/lottieLight.ts`로 동적 import)다. 엔진·JSON은 모듈에서 한 번만 받아 공유하고, 동작 줄이기에서는 첫 프레임에 정지하며, 받지 못하면 빈 자리만 남긴다. 상태 안내는 사용하는 화면이 live region으로 맡고, 흰 점이 dim 위에서만 보이므로 로딩은 항상 `PageLoading`으로 쓴다.
- 편집 중 표시 (Editing, 2026-11-01, 디자이너 확정): 입력창·코멘트 카드·캡션 줄의 「다른 멤버가 편집 중」 표시는 모두 디자이너가 전달한 `editing.json`(30×25)으로 처리하고 DS의 점 애니메이션 컴포넌트는 두지 않는다. 자산은 `apps/web/src/shared/assets/lotties/editing.json`, 공통 컴포넌트는 `shared/components/loading/EditingLottie.tsx`다. DS `TextField`·`BundleCommentCard`는 `editing`과 `editingContent`(앱이 넘기는 애니메이션 자리)만 받아 로티 의존을 갖지 않는다. 엔진·JSON 공유, 동작 줄이기(첫 프레임 정지), 받지 못했을 때 빈 자리는 `LoadingDots`와 같다.
- 재생 실패 (확정): 로티가 화면 전환을 이끄는 경우(로딩 화면) 라이브러리·자산을 못 받거나 재생 오류가 나면 멈추지 않고 다음 화면으로 넘긴다.
- 동작 줄이기 (확정): 정지 프레임이 의미가 없는 장면은 로티를 불러오지 않고 짧게 안내만 둔 뒤 넘어간다(`BunchJoinMotion`).

## 페이지 전환

web은 [SSGOI의 DOM 경계](https://ssgoi.dev/docs/how-it-works)를 사용한다. React 실험 기능 `ViewTransition`과 별도의 전역 전환 CSS는 사용하지 않는다.

- 설정: `apps/web/src/app/(app)/AppTransitions.tsx`의 경로 쌍과 `ONBOARDING_TRANSITION_DURATION_MS`를 수정한다. 전역 provider만 공유하며, 등록하지 않은 이동과 첫 진입에는 전환을 적용하지 않는다.
- 효과: 온보딩 시작 → 만들기·참여, 만들기 완료 → 초대는 `slide`를 사용한다. 새 화면은 오른쪽에서 들어오고 기존 화면은 왼쪽으로 화면 폭만큼 밀린다. 반대 이동은 방향을 뒤집는다. 페이드는 섞지 않고 경계 밖을 잘라낸다. 참여 화면의 시각 전환은 미검증이다.
- 시간·곡선: Slide In / Left / 이동 시간 300ms를 적용한다. 곡선은 사용자 합의에 따라 설계서의 Ease In 대신 Ease Out으로 조정한다. SSGOI의 `override`에 `easeOutIntegrator`를 넣어 CSS `cubic-bezier(0, 0, .58, 1)`의 진행도를 계산한다. 라이브러리의 `easeOut({ duration })`은 관성 기반 곡선이므로 CSS 곡선과 동일하다고 취급하지 않는다. 이동 시간과 라이브러리의 종료 판정 시간은 구분한다. 이전 200ms 설정에서 SSGOI 7.4.1의 WAAPI timeline 약 233ms를 확인했으며, 현재 300ms 설정의 실제 종료 시간은 브라우저 재검증 전이다.
- 상태 유지: 상위 layout은 provider만 유지한다. 실제 route의 DOM에 `data-ssgoi-transition`을 지정하고, 만들기 layout 내부에서 단계 묶음·완료·초대를 구분한다. URL을 먼저 감지하는 상위 경계에서 빈 화면이 전환되는 문제를 피하려고 콘텐츠와 경계를 함께 마운트한다. 1~3단계의 헤더·Stepper와 draft provider는 유지한다. 단계 사이의 본문 전환은 현재 등록하지 않았다.
- 하단 탭 전환 (2026-11-01, 결정 기록 017): 웹 탭 막대의 네 탭 사이 이동은 80ms 등속 크로스페이드다. 들어오는 탭은 아래에 불투명하게 두고 위로 올린 나가는 탭만 페이드해 같은 헤더가 흐려지지 않는다. 탭 page는 `MainTabPage`로 감싼다. 나가는 탭은 다른 페이지 전환처럼 `inert`로 둔다. 상태 바 영역을 칠하는 `AppFrame` 배경도 나가는 화면(`data-page-leaving`, 모든 등록 전환이 붙임)의 표식을 무시하고 화면과 함께 바뀐다. 기본 150ms ease-out, 웹 탭 막대가 있으면 80ms 등속이다. Next가 새 화면을 그리는 순간 이전 화면이 잠깐 빠져 배경이 먼저 바뀌므로 transition은 전환 전부터 `AppFrame`에 걸어 둔다. 앞 화면 장식이 Safe Area를 덮고 넘어오는 화면(초대 확인)은 `data-app-background-instant`로 즉시 바꾼다. 전환 규칙이 없는 이동도 상태 바 영역은 150ms 페이드라, 번치 홈처럼 배경색이 다른 화면에서 규칙 없는 이동을 추가하면 함께 본다. SSGOI 7.4.1의 `LinearIntegrator`는 지수 감속이라 등속 integrator를 직접 둔다. iOS 앱은 시스템 탭 바라 쉘의 로컬 모듈(`apps/mobile-shell/modules/tab-crossfade`)이 같은 방식으로 전환한다.
- 번치 추가 (2026-11-01): 화면설계서(`1892:37781` 7·8번)대로 번치 홈 전환 시트의 「새로운 번치 추가하기」는 시트가 다 내려간 뒤(`onOpenChangeComplete`) 번치 시작 선택(`/onboarding`)으로 이동하고, `/bunch` → `/onboarding`에 Dissolve / Ease out / 150ms(`fade`, 단계마다 75ms, `BUNCH_ADD_DISSOLVE_DURATION_MS`)를 등록했다. 하단 탭 막대는 `(main)` layout에 있어 전환 대상 밖이라 이동과 함께 바로 사라진다. Chromium에서 시트 닫힘 → 번치 홈 페이드 아웃 → 시작 선택 페이드 인 순서를 확인했다.
- 번치 더보기 메뉴 (2026-11-01, 이슈 #169): 화면설계서(`1892:37780`)대로 번치 홈 「더보기」 → 메뉴는 Move in / ← / Ease out / 150ms, 메뉴 뒤로 가기는 Move out / → / 같은 시간이다(`BUNCH_MENU_MOVE_DURATION_MS`). `slide`와 달리 아래 화면은 움직이지 않고, 들어오는 메뉴가 위에서 덮거나 나가는 메뉴가 위에서 빠진다. 양방향 규칙 하나(`bidirectional`)에 방향별 동작을 둔다. Chromium(앱 폭 430px)에서 메뉴가 430→0, 0→430으로 약 150ms에 움직이고 번치 홈은 제자리인 것을 확인했다. 전환 도중 반대로 이동하면 현재 위치에서 이어지지 않고 처음 위치부터 다시 움직인다(150ms라 수용). 실기기와 동작 줄이기는 확인하지 않았다.
- 번치 더보기 메뉴의 하위 화면 (2026-11-01, 이슈 #172): 메뉴 → 프로필 편집은 화면설계서에 정의가 없어, 한 단계 들어가는 이동으로 보고 미는 `slide`·300ms ease-out(`BUNCH_MENU_SUB_SLIDE_DURATION_MS`)으로 정했다(디자이너 요청). 번치 홈 → 메뉴의 덮는 Move in과 구분된다. 다른 하위 화면도 같은 규칙에 경로를 더한다. 멤버 관리(메뉴 ↔ 멤버 관리, 멤버 관리 ↔ 역할별 권한, 메뉴·멤버 관리 ↔ 멤버 초대)도 같은 slide다(#175). 메뉴 ↔ 차단 목록(#178), 메뉴 ↔ 새 관리자 지정(#180)도 같다. 새 관리자를 지정하고 나가면 지정 화면에서 번치 탭으로 두 칸 되돌아가므로, 이 이동에도 메뉴와 같은 Move out을 둔다.
- 가입 화면 뒤로 가기 (2026-10-19): 화면설계서(설계서 프레임 `796:9226`)의 약관·프로필 작성 화면 헤더 뒤로 가기는 Dissolve / Ease out / 300ms다. 약관 → 로그인, 프로필 → 약관, 약관 원문 → 약관에 `fade`(fade-through)를 등록했다. `fade`는 나가는 화면이 먼저 사라진 뒤 들어오는 화면이 나타나는 순차 방식이라 단계마다 150ms(`SIGNUP_DISSOLVE_DURATION_MS`의 절반)로 전체 약 300ms가 되게 했고, 설계서의 교차 디졸브와 모양이 다르다. SSGOI의 `bidirectional: false`는 이 규칙에서 전환을 일으키지 못해 쓰지 못했고, 규칙이 양방향이라 앞으로 가는 이동(로그인 → 약관, 약관 → 원문)에도 같은 디졸브가 적용된다. 약관 → 프로필 앞 이동은 규칙이 없어 전환이 없다. Chromium에서 중간 프레임(불투명도)을 확인했고 iOS WKWebView는 확인 전이다.
- 번들 작성 화면 이동 (2026-11-02, 이슈 #173): 작성 화면 ↔ 참여 멤버 관리, 작성 화면 ↔ 사진 캡션은 온보딩과 같은 `slide`·300ms 양방향 규칙이다(기획 확인). 동적 route라 고정 id(`BUNDLE_PATHS.transitionIds`의 draft·members·photo)를 규칙과 각 page의 DOM에 함께 쓴다. 캡션 ↔ 크게 보기, 참여 멤버 관리 ↔ 캡션은 등록하지 않았다. Chrome(375px)에서 새 화면 341→0·이전 화면 0→-375, 뒤로 가기는 반대로 약 300ms에 움직이는 것을 네 방향 모두 확인했고, 실기기와 동작 줄이기는 확인하지 않았다.
- 번들 만들기 추천 상세 (2026-11-01, 이슈 #161): 사진 선택 `/bunch/bundles/new`와 추천 번들 상세 사이는 `slide`·200ms(`BUNDLE_DETAIL_SLIDE_DURATION_MS`)이고 양방향 규칙 하나다. 상세는 동적 route라 약관 원문처럼 고정 id(`BUNDLE_SELECT_PATHS.transitionIds.recommendation`)를 규칙과 각 화면 DOM의 `data-ssgoi-transition`에 함께 쓴다. 곡선은 온보딩과 같은 합의에 따라 설계서의 Ease In 대신 Ease Out이다. 상세 ↔ 뷰어 전환은 시안이 없어 등록하지 않았다. Chromium(headless 375px)에서 프레임을 재서 새 화면 324→0·이전 화면 0→-375, 약 185ms로 끝나는 것을 확인했고, 실기기와 동작 줄이기는 아직 확인하지 않았다.
- 접근성: `prefers-reduced-motion` 변경을 구독해 전환 규칙을 비운다. SSGOI가 함수형 규칙을 캐시하므로 함수 안에서 설정을 읽는 것으로 대체하지 않는다. 전환 중 이전 화면은 `inert`로 포커스·접근성 탐색에서 제외하고 종료 시 복원한다.
- 검증: 진행도 단위 테스트와 온보딩 회귀 테스트, Chromium의 순방향·뒤로 가기·입력 유지·헤더 유지·동작 줄이기 변경·좁은 화면/넓은 화면 중간 프레임을 확인한다. iOS WKWebView와 실제 화면 읽기 도구는 별도 확인이 필요하다. 네이티브 스와이프와 전환 중 빠른 연속 이동도 실기기에서 확인한다.

### 온보딩 단계 진행바

- 화면설계서(Figma node `791:8480`)의 「진행바만 인터랙션 O」에 따라 단계 변경 시 진행바 색상만 CSS `ease-out`·300ms로 전환한다. 제목·본문에는 이 효과를 적용하지 않는다.
- `CreateBunchFrame`이 같은 `Stepper` 요소를 유지하고 `current`만 바꾼다. `ease-[ease-out]`은 Tailwind 기본 ease-out 곡선 대신 CSS 표준 곡선을 명시하며, 모션 감소 설정에서는 전환을 끈다. 전체 페이지의 300ms 슬라이드와 별도이다.
