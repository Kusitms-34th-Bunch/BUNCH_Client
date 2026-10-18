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
- 기본 진입에는 `ease-in`을 피한다. 온보딩의 페이지 Slide In은 끝에서 감속하도록 Ease Out 200ms를 적용한다.
- duration 기준: 버튼 피드백 100–160ms, 툴팁·작은 팝오버 125–200ms, 드롭다운·셀렉트 150–250ms, 모달·drawer 200–500ms. UI 애니메이션은 300ms를 넘지 않는다.

## 물리감

- `scale(0)`에서 시작하지 않는다. `scale(0.9~0.97)` + `opacity: 0`에서 시작한다.
- 팝오버·드롭다운은 트리거 쪽에서 자라나도록 `transform-origin`을 트리거 위치에 맞춘다. 모달은 예외로, 화면 중앙에 뜨므로 `transform-origin: center`를 유지한다.
- 버튼 press 피드백은 `transform: scale(0.97)`, `transition: transform 160ms ease-out` 정도로 절제한다.

## 성능

- `transform`과 `opacity`만 애니메이션한다. `width`, `height`, `top`, `left`, `padding`, `margin`을 애니메이션하면 매 프레임 layout을 다시 계산해 jank가 생긴다.
- 모션 라이브러리를 도입하면, 짧은 shorthand API(예: `x`/`y`/`scale`을 직접 넘기는 형태)가 실제로 하드웨어 가속되는 transform 문자열로 적용되는지 확인한다. 라이브러리에 따라 shorthand가 메인 스레드에서 계산되어 부하 상황에 프레임을 떨어뜨릴 수 있다.
- toast 추가, toggle처럼 빠르게 반복 트리거되는 대상은 `@keyframes`보다 CSS `transition`을 쓴다. transition은 진행 중에 재시작되면 현재 값에서 이어지지만, keyframes는 처음부터 다시 시작한다.

## 접근성

- `prefers-reduced-motion: reduce`를 존중한다. 모든 모션을 없애는 게 아니라 이동·위치 변화 중심의 모션은 줄이거나 제거하고, 상태 전달에 필요한 opacity·색상 전환은 남긴다.
- hover 애니메이션은 `@media (hover: hover) and (pointer: fine)`로 감싼다. 터치 기기는 탭에서도 hover 이벤트가 발생해 의도치 않게 재생된다.

## Stagger

그룹 진입 애니메이션은 항목 간 30–80ms 간격으로 순차 적용한다. 그 이상 벌어지면 느리게 느껴진다. stagger는 장식이므로, 재생 중에도 사용자의 interaction을 막지 않는다.

## Lottie

디자이너가 Lottie 애니메이션을 전달할 예정이다(2026-10-14). 온보딩에 쓸 예정이고, 로그인 화면에 쓸지는 미정이다. 아직 재생 라이브러리를 설치하지 않았고, 아래는 도입할 때의 기준이다.

- 온보딩은 로그인 뒤에 나오므로, 첫 화면 로딩을 늦추지 않고 동적 import로 자산을 받을 수 있다. 온보딩 한 단계가 보이는 동안 다음 단계의 자산을 미리 받아 두면 전환할 때 끊기지 않는다(FE 판단). 로그인 화면에 쓰기로 정해지면 그 화면은 첫 렌더가 늦어질 수 있으니 다시 판단한다.
- 자산 형식(`.json` 또는 압축된 `.lottie`)과 재생 라이브러리는 디자이너의 자산을 받은 뒤 정한다. 다른 프로젝트에서는 `lottie-react`를 썼다. production dependency 추가는 사용자 확인을 받는다.
- 여러 화면이 쓰는 자산은 design-system의 `lotties/` 폴더에 두고 `loadingAnimation`처럼 이름 붙인 export로 내보낸다(제안). 소비하는 쪽은 파일 경로 대신 이름을 쓴다. 한 화면에서만 쓰는 연출은 그 화면 가까이에 둔다.
- 재생 컴포넌트는 브라우저 API를 쓰므로 클라이언트 컴포넌트(`'use client'`)로 둔다. 서버 컴포넌트에서 직접 import하지 않는다.
- 자산이 50KB 이상이면 동적 import로 쓰는 시점에 받는다(제안). 정적 import하면 그 화면 번들에 JSON 전체가 들어간다. PR에는 자산 용량을 적는다.
- `prefers-reduced-motion: reduce`이면 자동 재생과 반복을 끄고 정지 프레임을 보여준다. 애니메이션을 유일한 정보 전달 수단으로 쓰지 않고, 같은 정보를 텍스트로도 준다.
- 장식용이면 `aria-hidden`을 주고, 의미가 있으면 텍스트 대체를 함께 준다.
- 컨테이너 크기를 고정해서, 자산을 받기 전후에 layout이 밀리지 않게 한다.
- 위 "애니메이션을 넣을지 판단" 표를 따른다. 자주 보는 요소에는 쓰지 않고 온보딩, 축하, 로딩 같은 드문 장면에 쓴다. "UI 애니메이션은 300ms를 넘지 않는다"는 전환에 대한 규칙이라 Lottie 연출 길이에는 적용하지 않지만, 재생 중에도 사용자의 interaction을 막지 않는다.
- 복잡한 애니메이션은 WebView에서 프레임이 떨어질 수 있다. 렌더러 선택과 프레임은 실기기에서 확인한다(FE 판단, 미검증).
- 테스트에서는 재생 라이브러리를 mock한다. 애니메이션의 모양은 테스트하지 않는다.

## 페이지 전환

web은 [SSGOI의 DOM 경계](https://ssgoi.dev/docs/how-it-works)를 사용한다. React 실험 기능 `ViewTransition`과 별도의 전역 전환 CSS는 사용하지 않는다.

- 설정: `apps/web/src/app/(app)/AppTransitions.tsx`의 경로 쌍과 `ONBOARDING_TRANSITION_DURATION_MS`를 수정한다. 전역 provider만 공유하며, 등록하지 않은 이동과 첫 진입에는 전환을 적용하지 않는다.
- 효과: 온보딩 시작 → 만들기·참여, 만들기 완료 → 초대는 `slide`를 사용한다. 새 화면은 오른쪽에서 들어오고 기존 화면은 왼쪽으로 화면 폭만큼 밀린다. 반대 이동은 방향을 뒤집는다. 페이드는 섞지 않고 경계 밖을 잘라낸다. 참여 route는 아직 없어 해당 화면 전환은 미검증이다.
- 시간·곡선: Slide In / Left / 이동 시간 200ms를 적용한다. 곡선은 사용자 합의에 따라 설계서의 Ease In 대신 Ease Out으로 조정한다. SSGOI의 `override`에 `easeOutIntegrator`를 넣어 CSS `cubic-bezier(0, 0, .58, 1)`의 진행도를 계산한다. 라이브러리의 `easeOut({ duration })`은 관성 기반 곡선이므로 CSS 곡선과 동일하다고 취급하지 않는다. 이동은 설정 시간에 도달하며 SSGOI 7.4.1은 종료 판정용 정지 프레임을 약 33ms 더 유지한다(200ms 설정 시 WAAPI timeline 약 233ms). 시간을 변경하면 이 구분도 브라우저에서 다시 확인한다.
- 상태 유지: 상위 layout은 provider만 유지한다. 실제 route의 DOM에 `data-ssgoi-transition`을 지정하고, 만들기 layout 내부에서 단계 묶음·완료·초대를 구분한다. URL을 먼저 감지하는 상위 경계에서 빈 화면이 전환되는 문제를 피하려고 콘텐츠와 경계를 함께 마운트한다. 1~3단계의 헤더·Stepper와 draft provider는 유지한다. 단계 사이의 본문 전환은 현재 등록하지 않았다.
- 접근성: `prefers-reduced-motion` 변경을 구독해 전환 규칙을 비운다. SSGOI가 함수형 규칙을 캐시하므로 함수 안에서 설정을 읽는 것으로 대체하지 않는다. 전환 중 이전 화면은 `inert`로 포커스·접근성 탐색에서 제외하고 종료 시 복원한다.
- 검증: 진행도 단위 테스트와 온보딩 회귀 테스트, Chromium의 순방향·뒤로 가기·입력 유지·헤더 유지·동작 줄이기 변경·좁은 화면/넓은 화면 중간 프레임을 확인한다. iOS WKWebView와 실제 화면 읽기 도구는 별도 확인이 필요하다. 네이티브 스와이프와 전환 중 빠른 연속 이동도 실기기에서 확인한다.

### 온보딩 단계 진행바

- 화면설계서 `온보딩_03`(Figma node `791:8480`)의 「진행바만 인터랙션 O」에 따라 단계 변경 시 진행바 색상만 CSS `ease-out`·300ms로 전환한다. 제목·본문에는 이 효과를 적용하지 않는다.
- `CreateBunchFrame`이 같은 `Stepper` 요소를 유지하고 `current`만 바꾼다. `ease-[ease-out]`은 Tailwind 기본 ease-out 곡선 대신 CSS 표준 곡선을 명시하며, 모션 감소 설정에서는 전환을 끈다. 전체 페이지의 200ms 슬라이드와 별도이다.
