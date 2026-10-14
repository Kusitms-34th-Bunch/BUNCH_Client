# Motion

web·admin 모두 아직 전용 모션 라이브러리를 쓰지 않는다. 이 문서는 CSS transition·Web Animations API 기준으로 작성했고, 모션 라이브러리를 도입해도 아래 판단 기준은 그대로 적용한다.

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
- UI에 `ease-in`은 쓰지 않는다. 시작이 느려서 사용자가 보고 있는 바로 그 순간에 반응이 늦게 느껴진다.
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

React의 `<ViewTransition>`은 `unstable_` prefix가 붙는 실험 단계 컴포넌트다. apps/web에서 쓰려면 `next.config`에 `experimental.viewTransition: true`를 옵트인해야 하고, 여전히 `experimental` 네임스페이스에 있다는 점을 구현 기록에 남긴다. 순수 브라우저 API인 `document.startViewTransition` 자체는 안정적이니, React 컴포넌트 없이 직접 써도 된다.
