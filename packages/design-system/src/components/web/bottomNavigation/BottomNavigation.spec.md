# 컴포넌트: BottomNavigation

## 메타데이터

- 소유 경계: design-system `web` 구역(`@app/design-system/web`)
- Status: 구현됨(`glass`는 임의 효과, 실기기 미검증)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `BottomNavigationItem`(node `118:973`, 항목 8변형)과 `BottomNavigation`(node `127:2213`, 선택 탭별 4변형). 기능 범위는 `docs/specs/bottom-navigation.md`.

## 목적과 범위

### 제공하는 동작

- 알약형 흰 막대 안에 항목을 가로로 균등 배치한다. 선택된 항목은 Fill 아이콘·진한 라벨·연한 회색 알약 배경, 선택되지 않은 항목은 Line 아이콘·흐린 라벨이다.
- 항목은 `items`로 받고 선택은 `selectedId`로 받는다. 선택된 항목은 `aria-current="page"`를 가지고, 선택 알약이 그 항목 위치로 미끄러져 이동한다(아래 "선택 알약 이동").
- 막대를 누른 채 좌우로 끌면 알약이 손가락을 따라가고, 손을 뗀 위치의 항목이 선택된다(아래 "누른 채 끌어서 선택").
- 항목 요소(버튼 또는 링크)는 호출하는 쪽이 `renderItem`으로 정할 수 있다. 기본은 native `button`이다.

### 제공하지 않는 동작

- 탭 라벨·경로·현재 탭 판정, `next/link`, route 이동. 이 컴포넌트는 route를 모른다. 연결은 `apps/web`의 `features`가 한다.
- 하단 고정 위치와 Safe Area. `PageShell`의 `bottom` slot과 `AppFrame`이 맡는다.
- 알림 배지, 가운데 쓰기 버튼, 5번째 항목.
- 굴절(뒤 내용이 가장자리에서 휘는 효과). CSS로 낼 수 없고(SVG 변위는 Chromium 전용, 위 `docs`·시험 기록 참조) iOS 쉘(WebKit)에서 동작하지 않는다.

## Public API

- `BottomNavigation` props: `items`, `selectedId`, `aria-label`(필수, 막대의 이름), `glass?`(기본 꺼짐), `onItemSelect?`, `renderItem?`, 그리고 native `<nav>`의 속성(`className`, `ref` 등).
- `BottomNavigationItem` type: `{ id: string; label: string; icon: ReactNode; selectedIcon: ReactNode }`. 아이콘은 호출자가 넘긴다(Line은 `icon`, Fill은 `selectedIcon`, 24px).
- `glass`: 흰색 60% 배경 + `backdrop-blur-sm`(8px) + `backdrop-saturate-200` + 안쪽 흰 가장자리 반사 그림자. 디자인에 정의된 값이 아니라 개발 쪽에서 임의로 정한 효과이며 기본은 꺼져 있다. 토스·배민 iOS 26 탭 바 스크린샷과 비교해 고른 값이다. 처음 고른 값(흰색 80%, 블러 24px)은 iPhone 실기기에서 배민보다 많이 흐려 보여 블러를 8px로 줄이고 투명도·채도를 조정했다. 배민 화면의 뒤 글자 번짐을 같은 배경 위에서 Chromium으로 재현해 비교한 결과이며 iPhone 실기기로 다시 확인해야 한다. 윗면 광택은 쓰지 않는다(Playwright WebKit에서 회색 띠가 생겼다). 선택 알약은 글라스에서만 `rgba(120,120,128,0.16)`(iOS 시스템 탭 바와 같은 회색)을 쓴다. Figma의 `surface-secondary`(#f7f7f8)는 반투명 흰 막대 위에서 너무 연해 보였고, 배민 탭 바 스크린샷의 선택 알약은 약 #e8ebec였다. `backdrop-filter`를 지원하지 않는 환경에서는 블러와 채도 효과 없이 흰색 60% 배경이 보인다.
- 전달받은 nav 포인터 및 click capture 핸들러는 내부 제스처 처리 후 호출한다. 끌기 중 추가 포인터 입력은 무시한다.
- `onItemSelect(id)`(native `onSelect`와 이름이 겹치지 않게 `onItem` 접두사를 쓴다): 기본 button 항목을 눌렀을 때 호출한다. `renderItem`을 쓰면 호출하지 않는다(링크가 이동을 맡는다).
- `renderItem(item, state)`: `state`는 `{ selected, className, children, 'aria-current' }`다. 호출자는 `className`·`aria-current`·`children`을 그대로 요소에 붙이고 `href`나 `onClick`을 더한다. `aria-current`를 빠뜨리면 현재 항목 정보가 스크린 리더에서 사라지지만 타입으로 막지는 못한다.
- 호출자 소유 책임: 항목 문구(i18n), 경로, 현재 탭 판정, 링크 렌더, 막대의 폭과 위치.

## 상태와 동작

- 선택(`selected`): `selectedId`와 같은 항목. 선택된 항목이 없으면(`selectedId`가 목록에 없음) 모든 항목이 미선택으로 보인다.
- 긴 라벨·좁은 폭: 항목은 균등 분배(`flex-1 min-w-0`)하고 알약은 80px에서 줄어든다. 라벨은 한 줄로 잘리지만 접근성 이름은 전체 텍스트다. 호출자는 짧은 라벨을 써야 하고, 큰 글꼴에서 가장 긴 라벨(예: 마이페이지)이 먼저 잘린다.
- 누른 채 끌어서 선택: 누른 지점에서 6px 이상 움직이면 끌기로 본다(그 아래는 일반 탭). 끄는 동안 알약은 `transition` 없이 손가락 아래를 따라가고(막대 안으로 제한), 알약이 도착한 항목의 아이콘(Fill)·라벨 색이 활성으로 바뀌고 원래 항목은 비활성으로 돌아간다(배민 동작). `aria-current`는 손을 뗄 때까지 실제 선택에 머문다. 손을 떼면 그 위치 항목의 요소(button·a)를 프로그램으로 `click()`해 `onItemSelect`·링크 이동이 탭과 같은 경로로 한 번만 일어나고, 직후 50ms 동안 생기는 합성 click은 무시한다. `pointercancel`이면 선택하지 않고 알약이 돌아온다. 세로 스크롤은 `touch-pan-y`로 유지한다. Figma에 없고 토스·배민 탭 바 동작을 참고한 제안이다.
- 탭으로 이동: 알약이 새 항목으로 이동하는 동안(200ms) 이전 항목이 활성으로 보이다가, 이동 시작 150ms 뒤 새 항목의 아이콘·라벨이 활성으로 바뀐다. `aria-current`는 선택이 바뀌는 즉시 새 항목이다. 모션 감소면 즉시 바뀐다.
- 눌림·비활성·호버: Figma에 없어서 구현하지 않았다(확인할 항목).
- loading·empty·error 상태는 없다(정적 목록).

## 접근성

- `<nav aria-label>` 안의 `<ul>`/`<li>`. `aria-label`이 없으면 타입 오류다.
- 항목의 접근성 이름은 보이는 라벨이다. 아이콘은 `aria-hidden` 래퍼 안에 그려 호출자가 이름 있는 아이콘을 넘겨도 이름이 중복되지 않는다.
- 현재 항목은 `aria-current="page"`로 노출하고, 색만으로 상태를 전달하지 않는다(아이콘도 Line에서 Fill로 바뀐다).
- Keyboard·focus: 항목은 Tab으로 이동하고 Enter·Space(button) 또는 Enter(link)로 실행한다. `focus-visible` 윤곽선이 보인다.
- 터치 영역: 항목 80×56px로 보이는 아이콘(24px)보다 크다.
- `PageShell`의 `bottom` slot에 넣을 때 `<nav>` landmark를 호출자가 직접 만들지 않으므로(이 컴포넌트가 `<nav>`다) 중복되지 않는다.

## Styling과 의존성

Figma 속성과 토큰 대응표.

| Figma                  | 값                                                                      | 사용한 토큰·utility                        |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| 막대 배경              | `surface-primary`(white)                                                | `bg-surface-primary`                       |
| 막대 그림자            | `Shadow - Navi Bar`(0 0 24 #00000014)                                   | `shadow-navi-bar`                          |
| 막대 radius·padding    | full, 4px                                                               | `rounded-full`, `p-s2`                     |
| 선택 알약 배경         | `surface-secondary`(Figma 코드의 fallback은 #f5f5f5, 토큰 값은 #f7f7f8) | `bg-surface-secondary`                     |
| 알약 크기              | 80×56, radius full                                                      | `w-s24 h-s20 rounded-full`(80=s24, 56=s20) |
| 항목 세로 padding·간격 | 6px, 4px                                                                | `py-s3`, `gap-s2`                          |
| 아이콘                 | Line/Fill Icon-L 24px                                                   | 호출자가 넘기는 `…LargeIcon`(24px)         |
| 라벨                   | Pretendard Regular 12/16, center                                        | `typography-caption-1-regular`             |
| 라벨 색                | 미선택 `text-tertiary`, 선택 `text-primary`                             | `text-text-tertiary`, `text-text-primary`  |

- 선택 알약 배경만 Figma 코드의 fallback(#f5f5f5)과 토큰 값(#f7f7f8)이 다르다. 토큰 바인딩을 기준으로 했고 디자이너 확인이 필요하다(확인할 항목). dependency 추가 없음. 아이콘은 `../../../icons`가 아니라 호출자가 주입한다.
- Storybook state matrix: `Default`(피드 선택), 탭별 선택 4종을 한 `Matrix`에 모은 story, 긴 라벨, 좁은 폭.

## 확인할 항목

- 눌림·호버·비활성 (미정): Figma에 정의가 없다. 다른 버튼의 눌림 오버레이를 임의로 적용하지 않았다. 디자이너 확인.
- 선택 알약 이동 (제안): Figma에 정의가 없지만 iOS 탭 바처럼 선택이 바뀌면 알약이 옆으로 미끄러지게 했다. 알약은 항목마다 따로 있지 않고 막대 위를 이동하는 한 장이며 `transform`만 쓴다(200ms `ease-in-out`, `docs/architecture/motion.md`의 이동 기준과 300ms 이하 기준). 처음 렌더에는 애니메이션이 없고 `prefers-reduced-motion`이면 즉시 이동하며 `selectedId`가 목록에 없으면 알약이 없다. 디자이너 확인.
- 누른 채 끌어서 선택 (제안, 미검증): Chromium·WebKit에서 마우스로만 확인했다. 실제 터치(손가락)에서 `touch-pan-y`·pointer capture가 의도대로 동작하는지, 스크린 리더 사용자에게 끌기 대안(탭·Enter)이 충분한지는 확인하지 못했다. iOS 쉘의 네이티브 막대에도 구현했으며 실제 터치·VoiceOver는 미검증이다. 디자이너 확인.
- 막대 폭 (제안): Figma는 343px 고정이지만 컴포넌트는 `w-full`로 두고 폭·좌우 여백은 호출자가 정한다. 390px 화면에서 343px이 되는 여백 규칙은 디자이너 확인.
- 알약 위치 (제안): Figma의 선택 알약은 항목 폭(약 83.75px)이 아니라 80px로 항목 안에 가운데 놓인다. 같은 크기로 구현했다.
- URL 하위 경로(예: `/bunch/123`)에서도 같은 탭이 선택되게 하는 규칙은 앱 조합의 몫이다. 이 컴포넌트는 `selectedId`만 본다.
- 선택 알약 배경 (제안): Figma 코드의 fallback은 `#f5f5f5`지만 토큰 `surface-secondary`는 `#f7f7f8`이다. 토큰을 기준으로 구현했다. 디자이너 확인.
- 마이페이지/MY 라벨: PRD는 「MY」, Figma는 「마이페이지」다. 라벨은 호출자가 정한다.

- 목록 의미 (미검증): Tailwind preflight가 `list-style: none`을 적용해 Safari VoiceOver가 목록 의미(항목 수)를 잃을 수 있다는 알려진 문제가 있다. `jsx-a11y/no-redundant-roles` lint가 `role="list"`를 막으므로 실기기 VoiceOver에서 문제가 확인되면 규칙 예외와 함께 추가한다.
- 포커스 윤곽선 대비 (미검증): `border-brand`의 비텍스트 대비(3:1)와, 첫·마지막 항목 윤곽선이 막대·`PageShell` 컨테이너 밖에서 잘리는지는 확인하지 못했다.
- 큰 글꼴 (미검증): 고정 높이 `h-s20`에서 브라우저 글꼴 200% 확대 시 라벨이 넘치는지 확인하지 못했다.

## 검증

- [x] 사용자 관찰 동작 test 작성( nav 이름·순서, aria-current, Fill/Line 아이콘 전환, 목록에 없는 selectedId, onItemSelect, 키보드, renderItem 링크, renderItem 시 onItemSelect 미호출, className 전달)
- [x] 지원 상태 story 작성(`Default`, `Matrix`, `Interactive`, `LongLabel`, `Narrow`)
- [x] public export 영향 확인(`yarn gen:index`로 `web/index.ts`에 `bottomNavigation` export 추가, 생성기의 web 구역 선택 동작)
- [x] 실행 command와 결과: `yarn workspace @app/design-system test`·lint·typecheck, `yarn check:generated`, `format:check` 통과
- [x] Storybook 렌더 확인(headless Chrome, 375px 장식 폭). 막대 343×64·radius 999·padding 4·그림자 `0 0 24 rgba(0,0,0,.08)`·알약 80×56·아이콘 24·라벨 12/16·선택 `#121212`·미선택 `#535a61`이 Figma 값과 같다. 선택 알약 배경은 토큰 `surface-secondary`(렌더 `#f7f7f8`)이며 Figma 코드의 fallback `#f5f5f5`와 1~2 단계 다르다(토큰 바인딩 기준으로 구현).
- [x] 긴 라벨(한 줄 말줄임, 가로 넘침 없음), 280px 폭(항목 68px씩 줄어듦), 키보드 Tab→Tab→Enter로 선택 변경과 포커스 윤곽선(2px `border-brand`) 확인
- [ ] 픽셀 단위 비교, 390px 실기기, iOS WebView 렌더는 미검증. 첫 항목 알약이 Figma에서는 막대 왼쪽 안쪽 끝(4px)에 붙고 구현은 항목 가운데(약 6px)라 최대 2px 차이가 있다.
