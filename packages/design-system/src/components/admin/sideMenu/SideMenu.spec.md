# 컴포넌트: SideMenu

## 메타데이터

- 소유 경계: design-system (`admin` 구역)
- Status: 구현됨(2026-11-27 #590, 브라우저 시각 비교 전)
- 디자인 출처: Figma `BUNCH - 작업파일`의 `어드민 컴포넌트` > `Side Menu`(node `7602:161023`). Figma 이름과 코드 이름이 같다. `core`에 같은 이름이 없어 접두사를 붙이지 않는다.

## 목적과 범위

### 제공하는 동작

- 어드민 왼쪽 메뉴의 항목 하나(아이콘 + 라벨 + 건수 배지). 예: "신고 조회 및 처리 12".
- 상태: Default, Hover, Selected(현재 화면).

### 제공하지 않는 동작

- 메뉴 묶음(사이드바 틀, 로고, 항목 목록)은 만들지 않는다. 화면 틀이라 앱의 layout이 맡는다.
- 링크 이동은 하지 않는다. 링크를 어떻게 그릴지는 호출하는 쪽이 정한다(아래 Public API).
- 비활성 상태는 Figma에 없어 만들지 않는다.

## Public API

- Props:
  - `icon: ReactNode`: 라벨 앞 20px 아이콘(예: `LineAlertMediumIcon`). 색은 상태에 따라 컴포넌트가 정한다.
  - `children`: 라벨.
  - `count?: number`: 오른쪽 배지의 건수. 없으면 배지를 숨긴다.
  - `selected?: boolean`: 현재 화면 여부. 기본 `false`.
  - `href: string` 또는 `renderLink` 중 하나 필수(타입 유니온). `href`는 기본 `<a>`의 이동 주소다. 둘 다 없으면 링크로 읽히지 않아 막는다.
  - `renderLink?: (state) => ReactElement`: 링크를 그릴 함수. `state`(`className`, `aria-current`, `children`)를 링크 요소에 그대로 넘긴다. 앱은 라우터의 `Link`로 그린다(`BundleMembersSheet`와 같은 방식).
  - `className?: string`.
- 이벤트: 없음(이동은 링크가 맡는다).
- Controlled / uncontrolled: controlled. 현재 화면은 호출하는 쪽이 정한다.
- 호출자 소유 책임: 라벨 문구, 아이콘 선택, 건수 값, 현재 화면 판정, 이동 경로. 포커스 윤곽이 항목 밖으로 4px 나가므로 사이드바는 좌우 4px 이상 여백을 두고 윤곽을 자르지 않는다(`overflow-hidden` 금지).

## 상태와 동작

- Default: 라벨 `body-2-medium` `text-secondary`, 아이콘 `icon-secondary`.
- Hover(현재 화면이 아닐 때): `overlay-hover` 바탕.
- Selected: 바탕 `surface-inversed-lighter`, 라벨 `text-inversed`, 아이콘 `icon-inversed`.
- 배지: Figma `Badge`(Weak, Pink, L)와 같은 모양. 상태와 관계없이 같다.
- 긴 텍스트·overflow: 라벨은 한 줄로 두고 넘치면 말줄임한다. 배지는 줄어들지 않는다.
- 폭: 부모 폭을 채운다(Figma 248px은 사이드바 폭).

## 접근성

- Semantic element: 링크(`<a>` 또는 라우터 `Link`). 호출하는 쪽이 `<nav aria-label>`로 묶는다.
- 현재 화면: `aria-current="page"`로 전달한다.
- Accessible name·label: 라벨과 건수가 함께 읽힌다(예: "신고 조회 및 처리 12"). 아이콘은 `aria-hidden`이다.
- Keyboard·focus: Tab으로 이동하고 Enter로 이동한다. 포커스 윤곽은 `outline-border-brand` 2px 바깥쪽이다. 안쪽에 그리면 선택 배경(#535A61)과 대비가 약 1.1:1이라 보이지 않는다.

## Styling과 의존성

| Figma 값                                                                    | 토큰·클래스                                                            |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 높이 48, `radius-r2`(4)                                                     | `h-12 rounded-r2`                                                      |
| 패딩 좌우 `spacing-s3`(6), 위아래 `spacing-s4`(8)                           | `px-s3 py-s4`                                                          |
| 아이콘·라벨 간격 `spacing-s3`(6)                                            | `gap-s3`                                                               |
| 라벨 `Body-2-Medium` 15/22                                                  | `typography-body-2-medium`                                             |
| Default 라벨 `text-secondary`, 아이콘 선 #25282D                            | `text-text-secondary`, `text-icon-secondary`                           |
| Hover `overlay-hover`                                                       | `hover:bg-overlay-hover`                                               |
| Selected 바탕 `surface-inversed-lighter`, 라벨 `text-inversed`, 아이콘 흰색 | `bg-surface-inversed-lighter text-text-inversed`, `text-icon-inversed` |
| 배지 `chip-pink-bg`·`chip-pink-fg`, 패딩 8×4, `radius-r4`, `Body-3-Regular` | `ColorBadge`(weak, pink, lg)와 같은 값                                 |

- 허용되는 dependency: `tailwind-variants`, `core`의 `ColorBadge`.
- Storybook state matrix: `Default`, `Selected`, `WithoutCount`, `LongLabel`, `Menu`(여러 항목, 누르면 이동하지 않고 선택만 바뀜). story는 링크 기본 동작을 막아 Storybook 화면이 이동하지 않음.

## 모션

- 선택·Hover 배경과 글자·아이콘 색은 제자리에서 150ms로 바뀐다(색 전환 곡선 `ease`, 2026-11-27 사용자 결정). 선택 배경이 항목 사이를 미끄러지는 방식은 화면 전체가 바뀌는 메뉴라 시선이 배경에 쏠려 쓰지 않았다.
- 동작 줄이기: 상태를 알리는 색 전환이라 그대로 둔다(motion.md 「접근성」).

## 확인할 항목

- 배지 컴포넌트 위치 (확정): `ColorBadge`를 `web`에서 `core`로 옮겨 쓴다(2026-11-27 사용자).
- 링크 렌더링 (확정): 링크로 그리고 `renderLink`로 호출자의 라우터 링크를 받는다(2026-11-27 사용자).
- 라벨 말줄임 (제안): Figma에 긴 라벨 모양이 없어 한 줄 말줄임으로 둔다. 잘린 이름을 화면에서 볼 방법은 없다(스크린 리더는 전체를 읽음). 어드민 메뉴 이름은 짧아 문제가 되지 않을 것으로 본다.
- 배지 글자 대비 (미정): `ColorBadge` pink weak는 글자 대비 2.62:1로 AA(4.5:1)에 못 미친다(`ColorBadge.spec.md`). 건수는 글자로 전달되지만 읽기 어려울 수 있다. 디자이너 확인이 필요하다.
- 건수의 뜻 (제안): "신고 조회 및 처리 12"로 읽혀 무엇의 12인지 화면 낭독만으로는 알기 어렵다. 실제 화면에서 건수의 뜻(처리 대기 등)이 정해지면 보조 문구를 받는 prop을 검토한다.

## 검증

- [x] 사용자 관찰 동작 test
- [x] 지원 variant·edge state story
- [x] public export 영향 확인(`@app/design-system/admin`, `yarn gen:index`)
- [x] 실행 command와 결과: `yarn workspace @app/design-system vitest run src/components/admin`, `eslint`, `tsc --noEmit` 통과(2026-11-27)
- [ ] 브라우저에서 Figma 기준 화면과 시각 비교
