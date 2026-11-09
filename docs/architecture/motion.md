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
  - 예외: 내용 높이를 모르는 칸을 펼치고 접을 때는 `grid-template-rows` 0fr↔1fr로 자리를 벌린다(아코디언, 번치 프로필 편집 공개 안내, 신고 상세 사유). `transform`으로는 아래 내용과 시트 높이를 밀어낼 수 없다. 사용자가 누를 때 한 번만 일어나고 반복 재생되지 않아 layout 비용을 받아들인다.
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
| 바텀시트            | `0, 0, 0.35, 1`. 열기 340ms 아래에서 위로·40%→100%, 닫기 240ms 위에서 아래로·100%→40%. 드래그를 놓으면 내려가며 닫힘                                     | `BottomSheet`의 Popup·Backdrop transition. 끄는 동안은 transition을 끄고 손을 따라 움직인다. `40%→100%`는 토스트와 같은 표기라 투명도로 해석                                                                                    |
| 모달                | 패널 중앙에서 opacity 0→1·scale 1.3→1, 200ms `0.03, 0.4, 0.1, 1`. 딤 100ms `0, 0, 0.15, 1`. 닫힘은 크기 유지·패널과 딤 100ms `0.35, 0, 1, 1` 페이드 아웃 | `Dialog`(`ConfirmDialog`·`ActionDialog` 포함)의 Popup·Backdrop 기본 transition. 값 출처는 온보딩 나가기 모달(`BunchMood.spec.md`)                                                                                               |
| 메뉴 탭(아이콘)     | 탭을 누르면 Dissolve·Ease out·75ms(화면설계서 `1892:37781` 3번)                                                                                          | `MenuTabs.IconTab`이 겹친 Line·Fill 아이콘 투명도·색을 75ms ease-out으로 바꿈. 선택 밑줄은 Dissolve 대신 250ms ease-out으로 미끄러짐(아래 「메뉴 탭 밑줄 이동」). 번치 홈 탭 패널은 75ms 페이드 인(`page-content-in`)           |

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
- 로딩 상태 (2026-10-31, 앞으로의 기준): 「편집 중」(Editing)이 아닌 로딩 표시는 모두 디자이너가 전달한 `loading.json`(70×28, 원본 4.7KB·저장소 서식 적용 후 12KB, 표현식 없음)으로 처리한다. 사진별·요소별이 아니라 페이지 전체에 하며, 화면 전체를 `overlay-dim-subtle`로 덮고 가운데에 점 3개를 재생한다(Figma 사진함_12). 자산은 `apps/web/src/shared/assets/lotties/loading.json`, 공통 컴포넌트는 `shared/components/loading/PageLoading.tsx`(dim + 점)와 `LoadingDots.tsx`다. 재생은 `shared/components/loading/LazyLottie.tsx`, 엔진(`shared/lib/lottieLight.ts`)과 JSON의 동적 import·캐시는 `shared/lib/lottieLoader.ts`가 맡고 `EditingLottie`도 같이 쓴다. 엔진·JSON은 모듈에서 한 번만 받아 공유하고, 동작 줄이기에서는 첫 프레임에 정지하며, 받지 못하면 빈 자리만 남긴다. 상태 안내는 사용하는 화면이 live region으로 맡고, 흰 점이 dim 위에서만 보이므로 로딩은 항상 `PageLoading`으로 쓴다.
- 편집 중 표시 (Editing, 2026-11-01, 디자이너 확정): 입력창·코멘트 카드·캡션 줄의 「다른 멤버가 편집 중」 표시는 모두 디자이너가 전달한 `editing.json`(30×25)으로 처리하고 DS의 점 애니메이션 컴포넌트는 두지 않는다. 자산은 `apps/web/src/shared/assets/lotties/editing.json`, 공통 컴포넌트는 `shared/components/loading/EditingLottie.tsx`다. DS `TextField`·`BundleCommentCard`는 `editing`과 `editingContent`(앱이 넘기는 애니메이션 자리)만 받아 로티 의존을 갖지 않는다. 엔진·JSON 공유, 동작 줄이기(첫 프레임 정지), 받지 못했을 때 빈 자리는 `LoadingDots`와 같다.
- 재생 실패 (확정): 로티가 화면 전환을 이끄는 경우(로딩 화면) 라이브러리·자산을 못 받거나 재생 오류가 나면 멈추지 않고 다음 화면으로 넘긴다.
- 동작 줄이기 (확정): 정지 프레임이 의미가 없는 장면은 로티를 불러오지 않고 짧게 안내만 둔 뒤 넘어간다(`BunchJoinMotion`).

## 페이지 전환

web은 [SSGOI의 DOM 경계](https://ssgoi.dev/docs/how-it-works)를 사용한다. React 실험 기능 `ViewTransition`과 별도의 전역 전환 CSS는 사용하지 않는다.

전환을 고르는 순서는 아래와 같다(2026-11-02 결정). 라이브러리를 들인 이유가 검증된 전환을 그대로 쓰는 것이라, 직접 만든 전환은 예외로만 둔다.

1. SSGOI 프리셋(`drill`·`slide`·`sheet`·`fade`·`zoom`·`hero` 등)에서 화면 관계에 맞는 것을 고른다. 목록 → 상세처럼 한 단계 들어가는 이동은 `drill`, 순서가 있는 단계는 `slide`, 모달 같은 화면은 `sheet`다.
2. 화면설계서의 시간·곡선은 프리셋의 `override`로만 맞춘다(예: `slide`에 `easeOutIntegrator`). 프리셋 기본값이 화면 관계에 맞으면 그대로 둔다.
3. 프리셋으로 표현할 수 없을 때만 직접 만들고, 이 문서에 이유를 적는다. 지금은 하단 탭 크로스페이드(결정 기록 017, 프리셋 `fade`가 순차 방식이라 같은 헤더가 흐려짐)가 해당한다.
4. 어느 전환이든 나가는 화면 처리(`inert`, `data-page-leaving`)는 `override`로 더한다.

- 설정: `apps/web/src/app/(app)/AppTransitions.tsx`의 경로 쌍과 `ONBOARDING_TRANSITION_DURATION_MS`를 수정한다. 전역 provider만 공유하며, 등록하지 않은 이동과 첫 진입에는 전환을 적용하지 않는다.
- 효과: 온보딩 시작 → 만들기·참여, 만들기 완료 → 초대는 `slide`를 사용한다. 새 화면은 오른쪽에서 들어오고 기존 화면은 왼쪽으로 화면 폭만큼 밀린다. 반대 이동은 방향을 뒤집는다. 페이드는 섞지 않고 경계 밖을 잘라낸다. 참여 화면의 시각 전환은 미검증이다.
- 시간·곡선: Slide In / Left / 이동 시간 300ms를 적용한다. 곡선은 사용자 합의에 따라 설계서의 Ease In 대신 Ease Out으로 조정한다. SSGOI의 `override`에 `easeOutIntegrator`를 넣어 CSS `cubic-bezier(0, 0, .58, 1)`의 진행도를 계산한다. 라이브러리의 `easeOut({ duration })`은 관성 기반 곡선이므로 CSS 곡선과 동일하다고 취급하지 않는다. 이동 시간과 라이브러리의 종료 판정 시간은 구분한다. 이전 200ms 설정에서 SSGOI 7.4.1의 WAAPI timeline 약 233ms를 확인했으며, 현재 300ms 설정의 실제 종료 시간은 브라우저 재검증 전이다.
- 상태 유지: 상위 layout은 provider만 유지한다. 실제 route의 DOM에 `data-ssgoi-transition`을 지정하고, 만들기 layout 내부에서 단계 묶음·완료·초대를 구분한다. URL을 먼저 감지하는 상위 경계에서 빈 화면이 전환되는 문제를 피하려고 콘텐츠와 경계를 함께 마운트한다. 1~3단계의 헤더·Stepper와 draft provider는 유지한다. 단계 사이의 본문 전환은 현재 등록하지 않았다.
- 하단 탭 전환 (2026-11-01, 결정 기록 017): 웹 탭 막대의 네 탭 사이 이동은 80ms 등속 크로스페이드다. 들어오는 탭은 아래에 불투명하게 두고 위로 올린 나가는 탭만 페이드해 같은 헤더가 흐려지지 않는다. 탭 page는 `MainTabPage`로 감싼다. 나가는 탭은 다른 페이지 전환처럼 `inert`로 둔다. 상태 바 영역을 칠하는 `AppFrame` 배경도 나가는 화면(`data-page-leaving`, 모든 등록 전환이 붙임)의 표식을 무시하고 화면과 함께 바뀐다. 기본 150ms ease-out, 웹 탭 막대가 있으면 80ms 등속이다. Next가 새 화면을 그리는 순간 이전 화면이 잠깐 빠져 배경이 먼저 바뀌므로 transition은 전환 전부터 `AppFrame`에 걸어 둔다. 앞 화면 장식이 Safe Area를 덮고 넘어오는 화면(초대 확인)은 `data-app-background-instant`로 즉시 바꾼다. 전환 규칙이 없는 이동도 상태 바 영역은 150ms 페이드라, 번치 홈처럼 배경색이 다른 화면에서 규칙 없는 이동을 추가하면 함께 본다. SSGOI 7.4.1의 `LinearIntegrator`는 지수 감속이라 등속 integrator를 직접 둔다. iOS 앱은 시스템 탭 바라 쉘의 로컬 모듈(`apps/mobile-shell/modules/tab-crossfade`)이 같은 방식으로 전환한다.
- 번치 추가 (2026-11-01): 화면설계서(`1892:37781` 7·8번)대로 번치 홈 전환 시트의 「새로운 번치 추가하기」는 시트가 다 내려간 뒤(`onOpenChangeComplete`) 번치 시작 선택(`/onboarding`)으로 이동하고, `/bunch` → `/onboarding`에 Dissolve / Ease out / 150ms(`fade`, 단계마다 75ms, `BUNCH_ADD_DISSOLVE_DURATION_MS`)를 등록했다. 하단 탭 막대는 `(main)` layout에 있어 전환 대상 밖이라 이동과 함께 바로 사라진다. Chromium에서 시트 닫힘 → 번치 홈 페이드 아웃 → 시작 선택 페이드 인 순서를 확인했다.
- 번치 더보기 메뉴 (2026-11-01 #169, 2026-11-02 #186에서 변경): 번치 홈 「더보기」 → 메뉴와 뒤로 가기는 SSGOI `drill`(기본 `parallax`) 프리셋에 Ease out / 250ms만 `override`로 적용한다(`BUNCH_DRILL_DURATION_MS`). 화면설계서(`1892:37780`)는 150ms지만 빨라 보여 사용자 결정으로 200ms로 했고, 2026-11-06에 다시 250ms로 늘렸다. 들어오는 화면은 오른쪽에서, 뒤 화면은 왼쪽으로 20% 함께 밀린다. 처음에는 150ms의 덮는 Move in(아래 화면 제자리)을 직접 만들었지만, 위 「프리셋 우선」 기준에 따라 같은 계열인 `drill`로 바꿨다. 그래서 뒤 화면도 움직이는 것이 화면설계서와 다르고, 이 차이는 디자이너에게 공유한다. 양방향 규칙 하나(`bidirectional`)다. 200ms 설정일 때 Chromium(앱 폭 430px)에서 열기·닫기 이동이 프레임 단위로 약 200ms에 끝나고(250ms는 프레임 측정 안 함) 프레임마다 이동 거리가 54→5px로 줄어(ease-out), 열자마자 뒤로 가도(0.08~0.3초) 두 화면에 남는 스타일이 없는 것을 확인했다. 실기기와 동작 줄이기는 확인하지 않았다.
- 번치 더보기 메뉴의 하위 화면 (2026-11-01, 이슈 #172): 메뉴 → 프로필 편집은 화면설계서에 정의가 없어, 한 단계 들어가는 이동으로 보고 미는 `slide`·300ms ease-out(`BUNCH_MENU_SUB_SLIDE_DURATION_MS`)으로 정했다(디자이너 요청). 번치 홈 → 메뉴의 `drill`과 구분된다. 다른 하위 화면도 같은 규칙에 경로를 더한다. 멤버 관리(메뉴 ↔ 멤버 관리, 멤버 관리 ↔ 역할별 권한, 메뉴·멤버 관리 ↔ 멤버 초대)도 같은 slide다(#175). 메뉴 ↔ 차단 목록(#178), 메뉴 ↔ 새 관리자 지정(#180)도 같다. 새 관리자를 지정하고 나가면 지정 화면에서 번치 탭으로 두 칸 되돌아가므로, 이 이동에도 메뉴와 같은 `drill`(되돌아가기)을 둔다. 번치 삭제도 메뉴 ↔ 안내 ↔ 확인 문구 입력이 같은 slide이고, 삭제하면 확인 화면에서 번치 탭으로 세 칸 되돌아가 같은 `drill`을 둔다(#184).
- 번치 알림 목록 (2026-11-02, 이슈 #186): 번치 탭 헤더 알림 → 알림 목록과 뒤로 가기는 더보기 메뉴와 같은 `drill`이다(SSGOI 데모의 Home → Notifications와 같은 프리셋). 화면설계서(`2236:41816` 3번)는 Move in / ← / Ease out / 150ms로 방향은 같다. 위에서 내려오는 `sheet` 계열도 검토했지만, 헤더의 뒤로 가기와 방향이 맞는 `drill`을 골랐다.
- 다른 번치 프로필 (2026-11-02, 이슈 #189): 피드 → 다른 번치 프로필 → 그 번치 멤버 목록, 프로필 헤더 알림 → 알림 목록도 한 단계 들어가는 이동이라 같은 `drill`(Ease out / 250ms)이다. 화면설계서에 이 이동의 전환 정의는 없다. 동적 route라 고정 id(`BUNCH_HOME_PATHS.transitionIds`)를 규칙과 각 화면 DOM의 `data-ssgoi-transition`에 함께 쓴다.
- 팔로워·팔로잉 목록 (2026-11-02, 이슈 #192): 번치 홈·다른 번치 프로필 → 팔로워·팔로잉 목록, 목록 → 대기 중인 팔로우 요청도 같은 `drill`이다. 목록 안의 팔로워 ↔ 팔로잉 탭 전환은 화면설계서(`2500:71333` 1번) Dissolve / Ease out / 150ms를 route 전환이 아니라 CSS로 맞췄다. 탭 글자색은 `transition-colors`, 새로 그려지는 패널은 `starting:opacity-0`에서 150ms에 걸쳐 나타나고, 동작 줄이기에서는 끈다. 선택 밑줄은 아래 「메뉴 탭 밑줄 이동」대로 미끄러진다.
- 신고 상세 사유 (2026-11-02, 사용자 결정): `ReportSheet`에서 「기타」를 고르면 상세 사유 칸이 번치 프로필 편집의 공개 안내처럼 자리가 벌어지며 나타나고(`grid-template-rows` 0fr→1fr·투명도, 150ms ease-out) 다른 사유를 고르면 접힌다. 시트 높이도 함께 바뀐다(위 「성능」의 펼침 예외). Storybook(Chromium)에서 높이 0→29→61→78→89px로 약 150ms에 열리고 같은 시간에 접히는 것을 확인했다.
- 라디오 선택 (2026-11-02, 사용자 결정): 디자인 시스템 `Radio`·`RadioButton`(신고 사유 등)의 가운데 점이 선택되면 절반 크기에서 커지며 나타나고 해제되면 줄며 사라진다. 테두리 색도 같이 150ms ease-out이다. 즉시 바뀌어 고른 항목이 덜 드러나던 것을 보완한다. Figma와 화면설계서에 정의가 없어 디자이너에게 공유한다. CSS `transition`(`scale`·`opacity`)만 쓰고 동작 줄이기에서는 끈다. Storybook(Chromium)에서 사유를 바꿀 때 새 점 0.5→1, 이전 점 1→0.5가 약 150ms에 끝나는 것을 확인했다.
- 메뉴 탭 밑줄 이동 (2026-11-02, 사용자 결정): 글자 탭(팔로워·팔로잉)과 아이콘 탭(번치 홈 번들) 모두 선택 밑줄이 사라지고 나타나는 Dissolve 대신, 선택된 탭으로 250ms ease-out에 걸쳐 미끄러진다. 위치 변화가 더 잘 보인다는 판단이다. 처음 200ms로 했지만 탭 폭(약 200px)만큼 움직이는 데 비해 ease-out 앞부분이 빨라(약 100ms에 80% 이동) 250ms로 늘렸다. Base UI `Tabs.Indicator`가 주는 탭 위치·폭 CSS 변수에 `transition`만 걸었다(`MenuTabs.List`). 글자색·아이콘과 패널의 페이드는 그대로다. 화면설계서(`1892:37781` 3번 75ms, `2500:71333` 1번 150ms)와 달라 디자이너에게 공유한다. Storybook(Chromium)에서 200ms일 때 밑줄이 프레임마다 감속하며 도착하는 것을 확인했다(글자 탭 0→119px, 아이콘 탭 0→36px). 250ms는 개발 서버에서 직접 보고 확정했다(프레임 측정은 하지 않음).
- 가입 화면 뒤로 가기 (2026-10-19): 화면설계서(설계서 프레임 `796:9226`)의 약관·프로필 작성 화면 헤더 뒤로 가기는 Dissolve / Ease out / 300ms다. 약관 → 로그인, 프로필 → 약관, 약관 원문 → 약관에 `fade`(fade-through)를 등록했다. `fade`는 나가는 화면이 먼저 사라진 뒤 들어오는 화면이 나타나는 순차 방식이라 단계마다 150ms(`SIGNUP_DISSOLVE_DURATION_MS`의 절반)로 전체 약 300ms가 되게 했고, 설계서의 교차 디졸브와 모양이 다르다. SSGOI의 `bidirectional: false`는 이 규칙에서 전환을 일으키지 못해 쓰지 못했고, 규칙이 양방향이라 앞으로 가는 이동(로그인 → 약관, 약관 → 원문)에도 같은 디졸브가 적용된다. 약관 → 프로필 앞 이동은 규칙이 없어 전환이 없다. Chromium에서 중간 프레임(불투명도)을 확인했고 iOS WKWebView는 확인 전이다.
- 번들 작성 화면 이동 (2026-11-02, 이슈 #173): 작성 화면 ↔ 참여 멤버 관리, 작성 화면 ↔ 사진 캡션은 온보딩과 같은 `slide`·300ms 양방향 규칙이다(기획 확인). 동적 route라 고정 id(`BUNDLE_PATHS.transitionIds`의 draft·members·photo)를 규칙과 각 page의 DOM에 함께 쓴다. 캡션 ↔ 크게 보기, 참여 멤버 관리 ↔ 캡션은 등록하지 않았다. Chrome(375px)에서 새 화면 341→0·이전 화면 0→-375, 뒤로 가기는 반대로 약 300ms에 움직이는 것을 네 방향 모두 확인했고, 실기기와 동작 줄이기는 확인하지 않았다.
- MY 회원 탈퇴 (2026-11-07, 이슈 #238): MY → 회원 탈퇴 안내와 뒤로 가기도 같은 미는 `slide` 300ms(`menuSubSlide`)다. 화면 설계서에 전환 정의는 없다. 프레임 측정·실기기·동작 줄이기는 확인 전이다. 탈퇴 안내 ↔ 관리자 권한 이전(`/my/withdrawal/transfer`, 이슈 #240)도 같은 `menuSubSlide`다.
- MY 약관 화면 (2026-11-06, 이슈 #235): MY → 서비스 이용약관·개인정보 처리방침과 뒤로 가기는 프로필 수정·알림 설정과 같은 미는 `slide` 300ms(`menuSubSlide`)다. 화면 설계서에 전환 정의는 없다. 동적 route라 고정 id(`MY_PATHS.transitionIds.terms`)를 규칙과 화면 DOM의 `data-ssgoi-transition`에 함께 쓴다.
- 사진함 선택 모드 플로팅 버튼 (2026-11-06, 이슈 #230, 사용자 결정): 선택 모드에서 탭 바가 숨으면 플로팅 버튼이 탭 바 숨김과 비슷하게 200ms ease-out으로 내려가고(`bottom` 전환), 아이콘 + → ···는 `FloatingButton`이 두 아이콘을 겹쳐 200ms 크로스페이드로 바꾼다. 화면설계서에 정의는 없다. 동작 줄이기에서는 둘 다 즉시 바뀐다. Chromium에서 버튼 아래 끝이 522→567px로 약 0.2초에 감속하며 내려가고 같은 시간에 두 아이콘 투명도가 교차하는 것을 확인했다. 실기기는 확인하지 않았다. 장기적으로는 iOS 사진 앱처럼 탭 바 자리의 하단 동작 막대를 디자이너에게 제안할 수 있다.
- 피드 → 번들 상세 (2026-11-09, 이슈 #266, 사용자 결정): 사진과 말풍선 모두 번치 메뉴와 같은 `drill`이다. `hero`도 시도했지만 카드와 상세 사진 크기가 같아 움직임이 작아서 쓰지 않았다. hero는 격자 썸네일에서 커지는 화면에 맞는다.
  - 스크롤: 스크롤은 페이지 안 `main`이 맡아 SSGOI 자동 복원 대상이 아니다. 나가는 화면이 DOM에 다시 붙으면 0이 되어 맨 위로 튀므로, 스크롤을 `transform`으로 옮겨 둔다(`FeedScreen`, `BundleDetailScreen`). 피드는 값을 그 history 항목에 둬 뒤로 올 때만 복원한다.
- 번들 만들기 진입 (2026-11-06, 이슈 #230, 사용자 결정): 번치 홈 플로팅 「번들 만들기」 → 사진 선택 `/bunch/bundles/new`와 닫기는 SSGOI `sheet` 기본 프리셋이다(SSGOI 데모 YouTube의 Home → Create와 같은 `sheet()`). 모달처럼 아래에서 올라오고 닫으면 내려가며, 시간·곡선은 프리셋 기본(spring)이다. `sheet`는 움직이는 화면만 애니메이션 대상이라 뒤 화면을 같은 전환 영역에서 찾아 다른 전환처럼 `data-page-leaving`·`inert`를 붙인다(`guardSheet`). 그래서 상태 바 영역 색이 시트가 다 올라온 뒤가 아니라 전환 시작과 함께 바뀐다. 시트가 움직이는 동안은 화면에 `data-sheet-moving`을 붙여 `AppFrame`의 색 전환을 150ms 대신 300ms ease-in-out으로 늘려, 시트가 위에 닿는 시점에 색이 다 바뀐다(Chromium에서 시트가 47px 남았을 때 흰색 도달, 약 0.31초). 하단 탭 막대는 전환 대상 밖이라 이동과 함께 바로 사라진다. Chromium(앱 폭 430px)에서 열 때 화면 위치가 547→0px로 약 300ms에 대부분 올라오고 약 0.7초에 멈추며, 닫을 때 반대로 내려가는 것을 확인했다. 실기기와 동작 줄이기는 확인하지 않았다.
- 번들 만들기 추천 상세 (2026-11-01, 이슈 #161): 사진 선택 `/bunch/bundles/new`와 추천 번들 상세 사이는 `slide`·200ms(`BUNDLE_DETAIL_SLIDE_DURATION_MS`)이고 양방향 규칙 하나다. 상세는 동적 route라 약관 원문처럼 고정 id(`BUNDLE_SELECT_PATHS.transitionIds.recommendation`)를 규칙과 각 화면 DOM의 `data-ssgoi-transition`에 함께 쓴다. 곡선은 온보딩과 같은 합의에 따라 설계서의 Ease In 대신 Ease Out이다. 상세 ↔ 뷰어 전환은 시안이 없어 등록하지 않았다. Chromium(headless 375px)에서 프레임을 재서 새 화면 324→0·이전 화면 0→-375, 약 185ms로 끝나는 것을 확인했고, 실기기와 동작 줄이기는 아직 확인하지 않았다.
- 접근성: `prefers-reduced-motion` 변경을 구독해 전환 규칙을 비운다. SSGOI가 함수형 규칙을 캐시하므로 함수 안에서 설정을 읽는 것으로 대체하지 않는다. 전환 중 이전 화면은 `inert`로 포커스·접근성 탐색에서 제외하고 종료 시 복원한다.
- 검증: 진행도 단위 테스트와 온보딩 회귀 테스트, Chromium의 순방향·뒤로 가기·입력 유지·헤더 유지·동작 줄이기 변경·좁은 화면/넓은 화면 중간 프레임을 확인한다. iOS WKWebView와 실제 화면 읽기 도구는 별도 확인이 필요하다. 네이티브 스와이프와 전환 중 빠른 연속 이동도 실기기에서 확인한다.

### 온보딩 단계 진행바

- Header Animation(Figma `1998:35008`, Smart animation·Slow·600ms): 진행바는 현재 단계까지 누적해 채우고 새 막대가 왼쪽에서 오른쪽으로 늘어난다(Fill Right). 제목은 5px 아래에서 올라오며 나타난다(Slide Up). 곡선은 둘 다 Slow 근사 `cubic-bezier(0.24, 0.3, 0.14, 1)`이다. Figma가 지정한 곡선이라 공통 규칙의 「진행바는 `linear`」의 예외다. 이전 기준(화면설계서 `791:8480` 「진행바만 인터랙션 O」, 색만 300ms)을 대체한다.
- `CreateBunchFrame`이 같은 `Stepper` 요소를 유지하고 `current`만 바꾼다. 첫 표시는 `@starting-style`로 채운다. 제목은 단계 화면마다 새로 마운트되므로 `PageHeader`에 `animate-step-title-in`(`globals.css`의 keyframe·`@utility`)을 건다. `@starting-style`을 지원하지 않는 브라우저(Safari 17.5·Chrome 117 미만)에서는 첫 표시 채움 없이 채운 상태로 바로 보인다. 모션 감소 설정에서는 둘 다 끈다. 전체 페이지의 300ms 슬라이드와 별도이다.
