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
- 화면과 박자를 맞춰야 하는 작업은 `requestAnimationFrame`(rAF)으로 한다.
  - 끌기·스크롤·당기기처럼 포인터·스크롤 이벤트가 프레임보다 자주 오는 동안 화면을 바꾸면, 이벤트마다 그리지 않고 프레임마다 한 번만 그린다. 값은 이벤트에서 기억하고 rAF 안에서 DOM style·CSS 변수에 쓴다(`useCropDrag`). 이때 React state로 다시 그리지 않는다([motion-components.md](motion-components.md)의 「당겨서 새로고침」「스크롤로 헤더 숨김」).
  - 계속 움직이는 효과(가장자리 자동 스크롤 등)는 `setInterval` 대신 rAF 반복으로 돌리고, 멈추거나 화면을 떠날 때 `cancelAnimationFrame`으로 끊는다(`useEdgeAutoScroll`).
  - 크기·위치를 읽는 일(`getBoundingClientRect`, `offsetHeight`, `scrollTop`)과 쓰는 일을 한 프레임 안에서 번갈아 하지 않는다. 읽기를 먼저 모으고 쓰기는 그 뒤(다음 rAF)에 한다. 번갈아 하면 브라우저가 매번 layout을 다시 계산한다.
  - 「화면이 그려진 다음」이 필요한 작업(새 화면의 초점 이동, 붙여넣기 뒤 커서 위치, 전환이 시작된 뒤의 스크롤)은 `setTimeout(0)`이 아니라 rAF로 미룬다(`RouteFocus`, `BundleDetail`의 「댓글로 이동」). `setTimeout`은 그리기와 박자가 맞지 않아 한 프레임 늦거나 먼저 실행될 수 있다.
  - 예약한 rAF는 effect 정리(cleanup)에서 취소한다. 화면이 사라진 뒤 실행되면 없는 요소를 건드린다.
- toast 추가, toggle처럼 빠르게 반복 트리거되는 대상은 `@keyframes`보다 CSS `transition`을 쓴다. transition은 진행 중에 재시작되면 현재 값에서 이어지지만, keyframes는 처음부터 다시 시작한다.

## 접근성

- `prefers-reduced-motion: reduce`를 존중한다. 모든 모션을 없애는 게 아니라 이동·위치 변화 중심의 모션은 줄이거나 제거하고, 상태 전달에 필요한 opacity·색상 전환은 남긴다.
- hover 애니메이션은 `@media (hover: hover) and (pointer: fine)`로 감싼다. 터치 기기는 탭에서도 hover 이벤트가 발생해 의도치 않게 재생된다.

## Stagger

그룹 진입 애니메이션은 항목 간 30–80ms 간격으로 순차 적용한다. 그 이상 벌어지면 느리게 느껴진다. stagger는 장식이므로, 재생 중에도 사용자의 interaction을 막지 않는다.

## 공통 모션(Figma 공통 모션)

Figma `공통 모션`(node `1962:18333`)이 정한 값이다. 디자이너가 지정한 값이라 위의 "UI 애니메이션은 300ms를 넘지 않는다"보다 우선한다. `transform`·`opacity` 중심이다(토스트는 sonner가 쓰는 `height` 전환도 같은 곡선으로 유지한다). 동작 줄이기에서는 이동·높이 전환을 빼고 투명도 전환만 남긴다.

| 대상                | Figma 값                                                                                                                                                                                | 구현                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 토스트              | Smart animation, `0, 0, 0.35, 1`, 350ms. 등장 5px 위로 이동·0%→100%, 퇴장 5px 아래로 이동·100%→0%. 노출 3초, 액션 버튼 포함 5초                                                         | `Toaster`가 sonner 항목에 transition을 덮어씀. 퇴장은 sonner가 200ms 뒤 항목을 제거해 200ms에 끝나게 함. 노출 시간은 `toast()`가 정함(액션이 있으면 5초)                                                                                                                                                                                                                                                                                                                                                        |
| 팝오버 메뉴         | 더보기 메뉴 애니메이션(`7548:97687`, 2026-11-20 변경): 열기 scale 0.35→1·0%→100%, 280ms `cubic-bezier(0.2, 0.9, 0.3, 1)`. 닫기 1→0.35·100%→0%, 180ms ease-in. 트리거 쪽 모서리에서 커짐 | `Menu`의 `open`·`onExited`. 기준점 기본은 오른쪽 위, 아래쪽 버튼 위 메뉴는 `--menu-motion-origin: bottom right`. 이전 값(38px 이동·Gentle 400ms)을 대체                                                                                                                                                                                                                                                                                                                                                         |
| 참여 멤버 카드 이동 | Smart animation, Gentle, 400ms(화면설계서 `2034:22714` 「멤버카드 목록 이동 인터랙션」). 「멤버 추가하기」와 「참여 멤버」 사이로 카드가 옮겨갈 때                                      | `useMoveAnimation`: 상태를 바꾸기 직전 위치를 기억하고 렌더 직후 달라진 만큼 `transform`으로 이동(FLIP). 곡선은 Gentle 스프링 근사 `cubic-bezier(0.22, 0, 0.4, 0.94)`(팝오버 메뉴가 쓰던 값)로 근사, 동작 줄이기에서는 이동하지 않음                                                                                                                                                                                                                                                                            |
| 번들 사진 삭제      | Smart Animate, Slow, 350ms(화면설계서 `2034:24751`의 「사진 삭제 인터랙션」). 사진을 빼면 남은 사진과 「+ 사진 추가」 카드가 빈자리를 메우며 이동                                       | `useMoveAnimation(SLOW_MOVE)`(FLIP, 이 모션을 쓰던 캡션 화면이 제거돼(#354) 지금은 쓰는 곳이 없고 작성 화면 썸네일 삭제 모션에서 이어 씀). Slow(스프링 80·20·1)는 과감쇠라 0.92초에 99%에 닿으므로 350ms 구간으로 압축해 `cubic-bezier(0.24, 0.3, 0.14, 1)`로 근사(오차 0.6% 이내). 이동 동안 스크롤 스냅을 꺼야 목록이 끌려가지 않음                                                                                                                                                                           |
| 칩 버튼             | 누르는 동안 Hover, 손을 떼면 Selected. 둘 다 Dissolve·Ease out·300ms                                                                                                                    | `ChipButton`의 색 transition과 오버레이 투명도 300ms. 눌리는 동안(`active`)과 마우스 호버가 같은 Hover 모양                                                                                                                                                                                                                                                                                                                                                                                                     |
| 버튼                | 누르는 동안 Dissolve·Ease out·75ms                                                                                                                                                      | 위 "Easing과 duration"의 버튼 눌림 항목                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 바텀시트            | `0, 0, 0.35, 1`. 열기 340ms 아래에서 위로·40%→100%, 닫기 240ms 위에서 아래로·100%→40%. 드래그를 놓으면 내려가며 닫힘                                                                    | `BottomSheet`의 Popup·Backdrop transition. 끄는 동안은 transition을 끄고 손을 따라 움직인다. `40%→100%`는 토스트와 같은 표기라 투명도로 해석. 끌어서 닫을 때만 흐려지지 않고 손을 뗀 속도에 맞춘 시간(400ms × `--drawer-swipe-strength`, 최소 200ms)·`0.32, 0.72, 0, 1`로 내려가고 배경은 200ms에 걷힌다(#492, 배경은 시트가 끝나면 함께 사라지고 속도 변수를 받지 못해 시트 최소 시간에 맞춤. 240ms 고정이면 긴 시트가 뚝 끊겨 보였음. 디자이너 공유). 동작 줄이기 설정이면 이 값을 쓰지 않고 기본 닫힘 그대로 |
| 모달                | 패널 중앙에서 opacity 0→1·scale 1.3→1, 200ms `0.03, 0.4, 0.1, 1`. 딤 100ms `0, 0, 0.15, 1`. 닫힘은 크기 유지·패널과 딤 100ms `0.35, 0, 1, 1` 페이드 아웃                                | `Dialog`(`ConfirmDialog`·`ActionDialog` 포함)의 Popup·Backdrop 기본 transition. 값 출처는 온보딩 나가기 모달(`BunchMood.spec.md`)                                                                                                                                                                                                                                                                                                                                                                               |
| 메뉴 탭(아이콘)     | 탭을 누르면 Dissolve·Ease out·75ms(화면설계서 `1892:37781` 3번)                                                                                                                         | `MenuTabs.IconTab`이 겹친 Line·Fill 아이콘 투명도·색을 75ms ease-out으로 바꿈. 선택 밑줄은 Dissolve 대신 250ms ease-out으로 미끄러짐([motion-page-transitions.md](motion-page-transitions.md)의 「메뉴 탭 밑줄 이동」). 번치 홈 탭 패널은 좌우 밀기([motion-page-transitions.md](motion-page-transitions.md)의 「번치 홈 번들 탭 패널 밀기」)                                                                                                                                                                   |

- 위쪽 토스트(`toast`의 `position: 'top'`, 제거된 사진 캡션 화면에서 쓰던 규칙): 같은 곡선·350ms로 등장은 5px 아래로 내려오며 0%→100%, 퇴장은 5px 위로 올라가며 100%→0%(화면설계서 `2034:24751` 3번, Chrome에서 프레임 측정으로 44→49px·49→44px 확인).
- 토스트·메뉴처럼 반복해서 열리는 요소는 `@keyframes`보다 transition을 우선하지만, 메뉴는 열릴 때마다 처음부터 재생하는 모양이라 `@keyframes`를 쓴다(닫는 도중 다시 열면 현재 위치에서 이어지지 않는 점은 수용).
- Gentle 값(100·15·1)은 Figma 프리셋의 알려진 값 기준이고 노드 데이터에서는 직접 확인하지 못했다. 디자이너가 다른 값을 쓰면 곡선만 바꾼다.
- 칩 버튼의 "Ease out"은 지금 Tailwind `ease-out`(`cubic-bezier(0, 0, 0.2, 1)`)이다. 버튼 눌림 항목과 마찬가지로 CSS 표준 곡선과 다르다.

## 사진함 업로드 상태 줄

[motion-components.md](motion-components.md)로 옮겼다(문서 길이, 2026-11-23).

## 당겨서 새로고침

[motion-components.md](motion-components.md)로 옮겼다(문서 길이, 2026-11-23).

## 스크롤로 헤더 숨김

[motion-components.md](motion-components.md)로 옮겼다(문서 길이, 2026-11-23).

## Lottie

[motion-components.md](motion-components.md)로 옮겼다(문서 길이, 2026-11-23).

## 페이지 전환

[motion-page-transitions.md](motion-page-transitions.md)로 옮겼다(문서 길이, 2026-11-23).
